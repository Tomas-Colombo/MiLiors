import 'server-only'
import { aiProvider } from '@/lib/ai'
import { esperar, interpretarFallo } from '@/lib/ai/errores'
import { buildInformePrompts } from './prompts'
import {
  calcularMotor,
  COMO_TRABAJAS_TITULOS,
  type HumanDesignInput,
  type MotorResultado,
} from './competencias'
import {
  INFORME_VERSION,
  type ComoTrabajasItem,
  type CompetenciaItem,
  type InformePersonalidadJSON,
  type InformeProseLLM,
} from '@/lib/types/informe'

export type InformeContext = {
  nombre: string
  especificidadPuesto: string | null
  /** 9 scores del Eneagrama: eneatipo(1-9) → porcentaje 0-100. */
  scores: Record<number, number>
  humanDesign: {
    tipo_energetico: string
    autoridad_hd: string
    perfil_hd: string
    estrategia_hd: string
  } | null
}

export type GeneracionResult =
  | { ok: true; contenido_json: InformePersonalidadJSON; tokens: { input: number; output: number }; modelo: string }
  | { ok: false; motivo: string }

/**
 * Intentos ante una respuesta defectuosa del modelo (JSON roto o prosa
 * incompleta). Dos alcanza: con `temperature: 0.6` un segundo tiro sale bien
 * casi siempre, y más intentos sólo multiplican el gasto ante un prompt que el
 * modelo no puede cumplir.
 */
const INTENTOS = 2

function extractJSON(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenceMatch) return fenceMatch[1].trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) return raw.slice(start, end + 1)
  return raw.trim()
}

/**
 * Clave de join entre lo que calculó el motor y lo que redactó el LLM.
 *
 * Es deliberadamente tolerante —minúsculas, sin acentos, sin puntuación y con
 * los espacios colapsados— porque el modelo transcribe los nombres a mano y
 * cualquier diferencia cosmética rompía el match: la barra sin espacios
 * alrededor, un punto final, una tilde comida. La descripción quedaba vacía y
 * el informe se guardaba igual.
 *
 * Se puede normalizar así de fuerte porque los nombres del motor siguen siendo
 * únicos después de pasar por acá. Hay un test que lo verifica y que va a
 * fallar el día que alguien agregue una competencia que colisione con otra.
 */
export function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function parseProse(raw: string): InformeProseLLM | null {
  try {
    const p = JSON.parse(extractJSON(raw))
    if (
      typeof p.subtitulo !== 'string' ||
      typeof p.descripcionPersonalidad !== 'string' ||
      p.descripcionPersonalidad.trim().length === 0 ||
      !Array.isArray(p.competenciasDesc) ||
      !Array.isArray(p.comoTrabajas)
    ) {
      return null
    }
    return p as InformeProseLLM
  } catch {
    return null
  }
}

export type FusionResult =
  | { ok: true; contenido_json: InformePersonalidadJSON }
  | { ok: false; faltantes: string[] }

/**
 * Cruza los números del motor con la prosa del LLM y exige que esté completa.
 *
 * Antes esta fusión resolvía cada hueco con `?? ''` y el informe se guardaba
 * como LISTO con descripciones vacías: nadie se enteraba. Ahora cualquier
 * casilla sin texto aborta la fusión y el llamador decide — reintentar, o
 * conservar el informe anterior. Un hueco visible en un documento es honesto;
 * uno invisible es un bug que aparece meses después.
 *
 * Es pura a propósito: la parte que falla no necesita ni LLM ni base para
 * testearse.
 */
export function fusionarInforme(
  nombre: string,
  motor: MotorResultado,
  prose: InformeProseLLM,
): FusionResult {
  const descCompetencia = new Map(prose.competenciasDesc.map(d => [norm(d.nombre), d.descripcion]))
  const textoComoTrabajas = new Map(prose.comoTrabajas.map(d => [norm(d.titulo), d.texto]))

  const faltantes: string[] = []

  /** Devuelve el texto no vacío de esa clave, o la anota como faltante. */
  function tomarTexto(mapa: Map<string, string>, clave: string): string {
    const valor = mapa.get(norm(clave))
    const limpio = typeof valor === 'string' ? valor.trim() : ''
    if (!limpio) {
      faltantes.push(clave)
      return ''
    }
    return limpio
  }

  const competencias: CompetenciaItem[] = motor.competencias.map(c => ({
    bloque: c.bloque,
    nombre: c.nombre,
    nivel: c.nivel,
    barras: c.barras,
    descripcion: tomarTexto(descCompetencia, c.nombre),
  }))

  // Reconstruimos los ítems en el orden canónico de títulos (el LLM podría variar).
  const comoTrabajas: ComoTrabajasItem[] = COMO_TRABAJAS_TITULOS.map(titulo => ({
    titulo,
    texto: tomarTexto(textoComoTrabajas, titulo),
  }))

  const subtitulo = prose.subtitulo.trim()
  if (!subtitulo) faltantes.push('subtitulo')

  if (faltantes.length > 0) return { ok: false, faltantes }

  return {
    ok: true,
    contenido_json: {
      nombre,
      subtitulo,
      descripcionPersonalidad: prose.descripcionPersonalidad.trim(),
      mapaPersonalidad: motor.mapaPersonalidad,
      competencias,
      comoTrabajas,
      version: INFORME_VERSION,
    },
  }
}

/**
 * Genera el informe de personalidad: motor determinístico + LLM para la prosa.
 * No escribe en la DB (responsabilidad del caller).
 */
export async function generarInformePersonalidad(ctx: InformeContext): Promise<GeneracionResult> {
  const hdInput: HumanDesignInput = ctx.humanDesign
    ? {
        tipo_energetico: ctx.humanDesign.tipo_energetico,
        autoridad_hd: ctx.humanDesign.autoridad_hd,
        perfil_hd: ctx.humanDesign.perfil_hd,
      }
    : null

  const motor = calcularMotor(ctx.scores, hdInput)

  const { systemPrompt, userPrompt } = buildInformePrompts({
    nombre: ctx.nombre,
    especificidadPuesto: ctx.especificidadPuesto,
    motor,
    humanDesign: ctx.humanDesign,
  })

  let ultimoMotivo = 'El servicio de IA no devolvió un informe utilizable.'

  for (let intento = 1; intento <= INTENTOS; intento++) {
    let result
    try {
      result = await aiProvider.generate({
        systemPrompt,
        userPrompt,
        responseFormat: 'json',
        maxTokens: 6000,
        temperature: 0.6,
      })
    } catch (err) {
      // El adaptador ya clasificó el error. Lo transitorio (503 sobrecargado,
      // 429, 5xx) se reintenta: es exactamente el caso que se arregla solo.
      // Lo demás —falta la credencial, respuesta truncada— no lo arregla otro
      // tiro, así que sale ya y el caller conserva el informe anterior.
      const fallo = interpretarFallo(err)
      ultimoMotivo = fallo.motivo

      console.error(
        `[informe/service] Intento ${intento}/${INTENTOS} — proveedor (${fallo.kind}):`,
        fallo.crudo,
      )

      if (fallo.transitorio && intento < INTENTOS) {
        await esperar()
        continue
      }
      return { ok: false, motivo: fallo.motivo }
    }

    const prose = parseProse(result.content)
    if (!prose) {
      ultimoMotivo = 'El servicio de IA devolvió una respuesta inválida.'
      console.error(
        `[informe/service] Intento ${intento}/${INTENTOS} — JSON inválido:`,
        result.content.slice(0, 300),
      )
      continue
    }

    const fusion = fusionarInforme(ctx.nombre, motor, prose)
    if (!fusion.ok) {
      ultimoMotivo = 'El servicio de IA devolvió el informe incompleto.'
      // Los nombres exactos que no matchearon: sin esto, "el informe salió
      // raro" no se puede diagnosticar sin reproducir la generación.
      console.error(
        `[informe/service] Intento ${intento}/${INTENTOS} — prosa incompleta. ` +
          `Sin texto (${fusion.faltantes.length}): ${fusion.faltantes.join(' | ')}`,
      )
      continue
    }

    console.info(
      `[informe/service] Generado con ${result.model} en el intento ${intento}/${INTENTOS}. ` +
        `Tokens: ${result.usage.inputTokens} in + ${result.usage.outputTokens} out.`,
    )

    return {
      ok: true,
      contenido_json: fusion.contenido_json,
      tokens: { input: result.usage.inputTokens, output: result.usage.outputTokens },
      modelo: result.model,
    }
  }

  return { ok: false, motivo: `${ultimoMotivo} Intentá de nuevo.` }
}
