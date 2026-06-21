import 'server-only'
import { aiProvider } from '@/lib/ai'
import { buildInformePrompts, type InformeContext } from './prompts'

const MIN_PALABRAS = 500
const MAX_PALABRAS = 1500

function contarPalabras(texto: string): number {
  return texto.trim().split(/\s+/).filter(Boolean).length
}

export type GeneracionResult =
  | { ok: true; contenido: string; palabras: number; tokens: { input: number; output: number }; modelo: string }
  | { ok: false; motivo: string }

/**
 * Generates the personality report by calling the active AI provider.
 * Does not write to DB — that is the caller's responsibility (Server Action).
 * Validates length: 500–1500 words.
 */
export async function generarInformePersonalidad(ctx: InformeContext): Promise<GeneracionResult> {
  const { systemPrompt, userPrompt } = buildInformePrompts(ctx)

  let result
  try {
    result = await aiProvider.generate({
      systemPrompt,
      userPrompt,
      maxTokens: 2500,  // margin above the 1500-word maximum
      temperature: 0.7,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido del proveedor de IA.'
    console.error('[informe/service] Error al llamar al proveedor:', msg)
    return { ok: false, motivo: msg }
  }

  const palabras = contarPalabras(result.content)

  // Usage log for cost monitoring
  console.info(
    `[informe/service] Generado con ${result.model}. ` +
    `Tokens: ${result.usage.inputTokens} in + ${result.usage.outputTokens} out. ` +
    `Palabras: ${palabras}.`
  )

  if (palabras < MIN_PALABRAS) {
    return {
      ok: false,
      motivo: `El informe generado es muy corto (${palabras} palabras, mínimo ${MIN_PALABRAS}).`,
    }
  }

  if (palabras > MAX_PALABRAS) {
    // Truncate at the limit — prefer this to marking as ERROR
    const truncado = result.content.split(/\s+/).slice(0, MAX_PALABRAS).join(' ') + '…'
    return {
      ok: true,
      contenido: truncado,
      palabras: MAX_PALABRAS,
      tokens: { input: result.usage.inputTokens, output: result.usage.outputTokens },
      modelo: result.model,
    }
  }

  return {
    ok: true,
    contenido: result.content,
    palabras,
    tokens: { input: result.usage.inputTokens, output: result.usage.outputTokens },
    modelo: result.model,
  }
}
