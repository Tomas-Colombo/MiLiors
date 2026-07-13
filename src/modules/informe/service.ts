import 'server-only'
import { aiProvider } from '@/lib/ai'
import { buildInformePrompts } from './prompts'
import {
  calcularMotor,
  COMO_TRABAJAS_TITULOS,
  type HumanDesignInput,
} from './competencias'
import type {
  ComoTrabajasItem,
  CompetenciaItem,
  InformePersonalidadJSON,
  InformeProseLLM,
  TalentoItem,
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

function extractJSON(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenceMatch) return fenceMatch[1].trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) return raw.slice(start, end + 1)
  return raw.trim()
}

function parseProse(raw: string): InformeProseLLM | null {
  try {
    const p = JSON.parse(extractJSON(raw))
    if (
      typeof p.subtitulo !== 'string' ||
      typeof p.descripcionPersonalidad !== 'string' ||
      p.descripcionPersonalidad.trim().length === 0 ||
      !Array.isArray(p.competenciasDesc) ||
      !Array.isArray(p.talentosDesc) ||
      !Array.isArray(p.comoTrabajas)
    ) {
      return null
    }
    return p as InformeProseLLM
  } catch {
    return null
  }
}

function norm(s: string): string {
  return s.trim().toLowerCase()
}

/**
 * Genera el informe de personalidad: motor determinístico + una sola llamada al
 * LLM para la prosa. No escribe en la DB (responsabilidad del caller).
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
    const msg = err instanceof Error ? err.message : 'Error desconocido del proveedor de IA.'
    console.error('[informe/service] Error al llamar al proveedor:', msg)
    return { ok: false, motivo: msg }
  }

  const prose = parseProse(result.content)
  if (!prose) {
    console.error('[informe/service] Respuesta no es JSON válido:', result.content.slice(0, 300))
    return { ok: false, motivo: 'El modelo no respondió con JSON válido. Intentá de nuevo.' }
  }

  // ── Fusión motor (números) + LLM (prosa) ──────────────────────────────────
  const descCompetencia = new Map(prose.competenciasDesc.map(d => [norm(d.nombre), d.descripcion]))
  const descTalento = new Map(prose.talentosDesc.map(d => [norm(d.nombre), d.descripcion]))
  const textoComoTrabajas = new Map(prose.comoTrabajas.map(d => [norm(d.titulo), d.texto]))

  const competencias: CompetenciaItem[] = motor.competencias.map(c => ({
    bloque: c.bloque,
    nombre: c.nombre,
    nivel: c.nivel,
    barras: c.barras,
    descripcion: descCompetencia.get(norm(c.nombre)) ?? '',
  }))

  const talentosTop: TalentoItem[] = motor.talentosTop.map(t => ({
    nombre: t.nombre,
    descripcion: descTalento.get(norm(t.nombre)) ?? '',
  }))

  // Reconstruimos los ítems en el orden canónico de títulos (el LLM podría variar).
  const comoTrabajas: ComoTrabajasItem[] = COMO_TRABAJAS_TITULOS.map(titulo => ({
    titulo,
    texto: textoComoTrabajas.get(norm(titulo)) ?? '',
  }))

  const contenido_json: InformePersonalidadJSON = {
    nombre: ctx.nombre,
    subtitulo: prose.subtitulo.trim(),
    descripcionPersonalidad: prose.descripcionPersonalidad.trim(),
    mapaPersonalidad: motor.mapaPersonalidad,
    competencias,
    talentosTop,
    comoTrabajas,
  }

  console.info(
    `[informe/service] Generado con ${result.model}. ` +
    `Tokens: ${result.usage.inputTokens} in + ${result.usage.outputTokens} out.`,
  )

  return {
    ok: true,
    contenido_json,
    tokens: { input: result.usage.inputTokens, output: result.usage.outputTokens },
    modelo: result.model,
  }
}
