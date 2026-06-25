import 'server-only'
import { aiProvider } from '@/lib/ai'
import { buildInformePrompts, type InformeContext } from './prompts'
import type { InformeJSON } from '@/lib/types/informe'

const INFORME_KEYS = [
  'perfil_personalidad',
  'fortalezas_laborales',
  'areas_desarrollo',
  'compatibilidad_entorno',
  'recomendaciones_reclutadores',
] as const

const MIN_WORDS_PER_SECTION = 50

function contarPalabras(texto: string): number {
  return texto.trim().split(/\s+/).filter(Boolean).length
}

function parseInformeJSON(raw: string): InformeJSON | null {
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
    const parsed = JSON.parse(cleaned)
    for (const key of INFORME_KEYS) {
      if (typeof parsed[key] !== 'string' || parsed[key].trim().length === 0) {
        return null
      }
    }
    return parsed as InformeJSON
  } catch {
    return null
  }
}

export type GeneracionResult =
  | { ok: true; contenido_json: InformeJSON; tokens: { input: number; output: number }; modelo: string }
  | { ok: false; motivo: string }

/**
 * Generates the personality report by calling the active AI provider.
 * Returns structured JSON — does not write to DB (caller's responsibility).
 */
export async function generarInformePersonalidad(ctx: InformeContext): Promise<GeneracionResult> {
  const { systemPrompt, userPrompt } = buildInformePrompts(ctx)

  let result
  try {
    result = await aiProvider.generate({
      systemPrompt,
      userPrompt,
      maxTokens: 3000,
      temperature: 0.7,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido del proveedor de IA.'
    console.error('[informe/service] Error al llamar al proveedor:', msg)
    return { ok: false, motivo: msg }
  }

  const informeJSON = parseInformeJSON(result.content)
  if (!informeJSON) {
    console.error('[informe/service] Respuesta no es JSON válido:', result.content.slice(0, 300))
    return { ok: false, motivo: 'El modelo no respondió con JSON válido. Intentá de nuevo.' }
  }

  for (const key of INFORME_KEYS) {
    if (contarPalabras(informeJSON[key]) < MIN_WORDS_PER_SECTION) {
      return {
        ok: false,
        motivo: `La sección "${key}" es demasiado corta (mínimo ${MIN_WORDS_PER_SECTION} palabras).`,
      }
    }
  }

  const totalPalabras = INFORME_KEYS.reduce((acc, k) => acc + contarPalabras(informeJSON[k]), 0)
  console.info(
    `[informe/service] Generado con ${result.model}. ` +
    `Tokens: ${result.usage.inputTokens} in + ${result.usage.outputTokens} out. ` +
    `Palabras totales: ${totalPalabras}.`
  )

  return {
    ok: true,
    contenido_json: informeJSON,
    tokens: { input: result.usage.inputTokens, output: result.usage.outputTokens },
    modelo: result.model,
  }
}
