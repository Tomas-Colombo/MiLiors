import 'server-only'
import { aiProvider } from '@/lib/ai'
import { esperar, interpretarFallo } from '@/lib/ai/errores'
import { buildInformePrompts } from './prompts'
import { calcularMotorV2, type MotorV2Resultado } from './competencias'
import {
  EJES_COMO_TRABAJA,
  INFORME_VERSION,
  type AnexoReclutador,
  type InformePersonalidadJSON,
  type InformeProseLLM,
} from '@/lib/types/informe'

export type InformeContext = {
  /** Nombre completo: va en el encabezado del documento. */
  nombre: string
  /** Cómo quiere que lo llamen en el texto. null = primer nombre. */
  nombrePreferido: string | null
  especificidadPuesto: string | null
  /** 9 scores del Eneagrama: eneatipo(1-9) → porcentaje 0-100. */
  scores: Record<number, number>
}

/** Un intento contra el modelo, tal como se guarda en `informe_auditoria`. */
export type IntentoAuditado = {
  intento: number
  modelo: string | null
  /** Respuesta cruda; null si el proveedor falló antes de responder. */
  salida: string | null
  ok: boolean
  motivo: string | null
  tokensEntrada: number | null
  tokensSalida: number | null
}

/** Lo que se mandó al modelo y lo que devolvió en cada intento. */
export type AuditoriaGeneracion = {
  entrada: Record<string, unknown>
  systemPrompt: string
  userPrompt: string
  intentos: IntentoAuditado[]
}

export type GeneracionResult =
  | {
      ok: true
      contenido_json: InformePersonalidadJSON
      /** Va a `informe_anexo`: nunca junto al informe que lee el postulante. */
      anexo: AnexoReclutador
      tokens: { input: number; output: number }
      modelo: string
      auditoria: AuditoriaGeneracion
    }
  | { ok: false; motivo: string; auditoria: AuditoriaGeneracion }

/**
 * Intentos ante una respuesta defectuosa del modelo (JSON roto o prosa
 * incompleta). Dos alcanza: un segundo tiro sale bien casi siempre, y más
 * intentos sólo multiplican el gasto ante un prompt que el modelo no puede
 * cumplir.
 */
const INTENTOS = 2

/**
 * Baja para que dos generaciones del mismo perfil se parezcan: fortalezas y
 * focos ya son fijos (los pone el motor), y la prosa no debería variar de tono
 * entre una regeneración y otra.
 */
const TEMPERATURA = 0.3

/** Tope de salida: el informe con anexo ronda los 3500 tokens. */
const MAX_TOKENS = 6000

/**
 * Saca las marcas de cita que a veces agrega el modelo (`[cite: 3]`,
 * `[cite_start]`) aunque el prompt las prohíbe. Se aplica a todo texto antes de
 * guardarlo: una marca así en el documento del postulante no tiene arreglo.
 */
export function limpiarCitas(texto: string): string {
  return texto
    .replace(/\s*\[cite[^\]]*\]/gi, '')
    .replace(/ {2,}/g, ' ')
    .trim()
}

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
    return p && typeof p === 'object' ? (p as InformeProseLLM) : null
  } catch {
    return null
  }
}

export type FusionResult =
  | { ok: true; contenido_json: InformePersonalidadJSON; anexo: AnexoReclutador }
  | { ok: false; faltantes: string[] }

/**
 * Cruza el motor con la prosa del LLM y exige que esté completa y fiel.
 *
 * Cualquier casilla sin texto aborta la fusión y el llamador decide —
 * reintentar, o conservar el informe anterior. Un hueco visible en un documento
 * es honesto; uno invisible es un bug que aparece meses después.
 *
 * Las fortalezas y los focos que el LLM repite tienen que ser los del motor, en
 * el mismo orden: si no coinciden, se regenera (especificación v2.0). Se
 * comparan normalizados y se guarda el nombre canónico del motor.
 *
 * Es pura a propósito: la parte que falla no necesita ni LLM ni base para
 * testearse. La prosa llega del modelo sin garantías de forma, por eso todo
 * acceso es defensivo.
 */
export function fusionarInforme(
  nombre: string,
  motor: MotorV2Resultado,
  prose: InformeProseLLM,
): FusionResult {
  const faltantes: string[] = []

  /** Texto limpio y no vacío, o lo anota como faltante. */
  const texto = (valor: unknown, clave: string): string => {
    const limpio = typeof valor === 'string' ? limpiarCitas(valor) : ''
    if (!limpio) faltantes.push(clave)
    return limpio
  }

  /** Lista de textos limpios; vacía cuenta como faltante. */
  const textos = (valor: unknown, clave: string): string[] => {
    const items = Array.isArray(valor)
      ? valor.map(v => (typeof v === 'string' ? limpiarCitas(v) : '')).filter(Boolean)
      : []
    if (items.length === 0) faltantes.push(clave)
    return items
  }

  /** Verifica que las competencias repetidas por el LLM sean las del motor, en orden. */
  const coinciden = <T extends { competencia?: unknown }>(
    recibidas: T[] | undefined,
    esperadas: { nombre: string }[],
    clave: string,
  ): T[] => {
    const lista = Array.isArray(recibidas) ? recibidas : []
    const ok =
      lista.length === esperadas.length &&
      esperadas.every((e, i) => norm(String(lista[i]?.competencia ?? '')) === norm(e.nombre))
    if (!ok) faltantes.push(`${clave}: no coinciden con el motor`)
    return lista
  }

  const fortalezasLLM = coinciden(prose.fortalezas, motor.fortalezas, 'fortalezas')
  const focosLLM = coinciden(prose.planDesarrollo?.focos, motor.focosDesarrollo, 'planDesarrollo.focos')

  const comoTrabaja = Object.fromEntries(
    EJES_COMO_TRABAJA.map(({ key }) => [
      key,
      {
        estilo: texto(prose.comoTrabaja?.[key]?.estilo, `comoTrabaja.${key}.estilo`),
        dondeCrecer: texto(prose.comoTrabaja?.[key]?.dondeCrecer, `comoTrabaja.${key}.dondeCrecer`),
      },
    ]),
  ) as InformeProseLLM['comoTrabaja']

  const anexoLLM = prose.anexoReclutador
  const anexo: AnexoReclutador = {
    preguntasSTAR: textos(anexoLLM?.preguntasSTAR, 'anexoReclutador.preguntasSTAR'),
    comoAsignarle: texto(anexoLLM?.comoAsignarle, 'anexoReclutador.comoAsignarle'),
    queEvitar: texto(anexoLLM?.queEvitar, 'anexoReclutador.queEvitar'),
    senalAlerta: texto(anexoLLM?.senalAlerta, 'anexoReclutador.senalAlerta'),
  }

  const contenido: InformePersonalidadJSON = {
    nombre,
    subtitulo: texto(prose.subtitulo, 'subtitulo'),
    sintesis: texto(prose.sintesis, 'sintesis'),
    mapaPersonalidad: motor.mapaPersonalidad,
    eneagrama: {
      dominante: motor.dominante,
      ala: motor.ala,
      secundario: motor.secundario,
      integracion: motor.integracion,
      estres: motor.estres,
    },
    fortalezas: motor.fortalezas.map((c, i) => ({
      competencia: c.nombre,
      texto: texto(fortalezasLLM[i]?.texto, `fortalezas.${c.nombre}`),
    })),
    comoTrabaja,
    mejorMomento: texto(prose.mejorMomento, 'mejorMomento'),
    bajoPresion: texto(prose.bajoPresion, 'bajoPresion'),
    ecosistema: {
      tareas: textos(prose.ecosistema?.tareas, 'ecosistema.tareas'),
      puestos: textos(prose.ecosistema?.puestos, 'ecosistema.puestos'),
      zonaFriccion: textos(prose.ecosistema?.zonaFriccion, 'ecosistema.zonaFriccion'),
    },
    planDesarrollo: {
      focos: motor.focosDesarrollo.map((c, i) => ({
        competencia: c.nombre,
        accion: texto(focosLLM[i]?.accion, `planDesarrollo.${c.nombre}`),
      })),
      preguntasReflexion: textos(prose.planDesarrollo?.preguntasReflexion, 'planDesarrollo.preguntasReflexion'),
    },
    version: INFORME_VERSION,
  }

  return faltantes.length > 0 ? { ok: false, faltantes } : { ok: true, contenido_json: contenido, anexo }
}

/**
 * Genera el informe de personalidad: motor determinístico + LLM para la prosa.
 * No escribe en la DB (responsabilidad del caller).
 */
export async function generarInformePersonalidad(ctx: InformeContext): Promise<GeneracionResult> {
  const motor = calcularMotorV2(ctx.scores)

  const { systemPrompt, userPrompt } = buildInformePrompts({
    nombre: ctx.nombre,
    nombrePreferido: ctx.nombrePreferido,
    especificidadPuesto: ctx.especificidadPuesto,
    motor,
  })

  const auditoria: AuditoriaGeneracion = {
    entrada: {
      nombre: ctx.nombre,
      nombrePreferido: ctx.nombrePreferido,
      especificidadPuesto: ctx.especificidadPuesto,
      scores: ctx.scores,
      motor,
    },
    systemPrompt,
    userPrompt,
    intentos: [],
  }

  let ultimoMotivo = 'El servicio de IA no devolvió un informe utilizable.'

  for (let intento = 1; intento <= INTENTOS; intento++) {
    let result
    try {
      result = await aiProvider.generate({
        systemPrompt,
        userPrompt,
        responseFormat: 'json',
        maxTokens: MAX_TOKENS,
        temperature: TEMPERATURA,
      })
    } catch (err) {
      // El adaptador ya clasificó el error. Lo transitorio (503 sobrecargado,
      // 429, 5xx) se reintenta: es exactamente el caso que se arregla solo.
      // Lo demás —falta la credencial, respuesta truncada— no lo arregla otro
      // tiro, así que sale ya y el caller conserva el informe anterior.
      const fallo = interpretarFallo(err)
      ultimoMotivo = fallo.motivo
      auditoria.intentos.push({
        intento,
        modelo: null,
        salida: null,
        ok: false,
        motivo: `${fallo.kind}: ${fallo.crudo}`,
        tokensEntrada: null,
        tokensSalida: null,
      })

      console.error(
        `[informe/service] Intento ${intento}/${INTENTOS} — proveedor (${fallo.kind}):`,
        fallo.crudo,
      )

      if (fallo.transitorio && intento < INTENTOS) {
        await esperar()
        continue
      }
      return { ok: false, motivo: fallo.motivo, auditoria }
    }

    const respuesta = {
      intento,
      modelo: result.model,
      salida: result.content,
      tokensEntrada: result.usage.inputTokens,
      tokensSalida: result.usage.outputTokens,
    }

    const prose = parseProse(result.content)
    if (!prose) {
      ultimoMotivo = 'El servicio de IA devolvió una respuesta inválida.'
      auditoria.intentos.push({ ...respuesta, ok: false, motivo: 'JSON inválido' })
      console.error(
        `[informe/service] Intento ${intento}/${INTENTOS} — JSON inválido:`,
        result.content.slice(0, 300),
      )
      continue
    }

    const fusion = fusionarInforme(ctx.nombre, motor, prose)
    if (!fusion.ok) {
      ultimoMotivo = 'El servicio de IA devolvió el informe incompleto.'
      auditoria.intentos.push({ ...respuesta, ok: false, motivo: `Incompleto o infiel: ${fusion.faltantes.join(' | ')}` })
      // Los nombres exactos que no matchearon: sin esto, "el informe salió
      // raro" no se puede diagnosticar sin reproducir la generación.
      console.error(
        `[informe/service] Intento ${intento}/${INTENTOS} — prosa incompleta. ` +
          `Problemas (${fusion.faltantes.length}): ${fusion.faltantes.join(' | ')}`,
      )
      continue
    }

    console.info(
      `[informe/service] Generado con ${result.model} en el intento ${intento}/${INTENTOS}. ` +
        `Tokens: ${result.usage.inputTokens} in + ${result.usage.outputTokens} out.`,
    )

    auditoria.intentos.push({ ...respuesta, ok: true, motivo: null })

    return {
      ok: true,
      contenido_json: fusion.contenido_json,
      anexo: fusion.anexo,
      tokens: { input: result.usage.inputTokens, output: result.usage.outputTokens },
      modelo: result.model,
      auditoria,
    }
  }

  return { ok: false, motivo: `${ultimoMotivo} Intentá de nuevo.`, auditoria }
}
