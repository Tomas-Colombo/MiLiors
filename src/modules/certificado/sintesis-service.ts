import 'server-only'
import { aiProvider } from '@/lib/ai'
import { buildSintesisPrompts, type SintesisPromptContext } from './sintesis-prompt'
import type { CertificadoSintesisJSON } from '@/lib/types/certificado'

export type SintesisContext = SintesisPromptContext

export type SintesisResult =
  | { ok: true; sintesis: CertificadoSintesisJSON; tokens: { input: number; output: number }; modelo: string }
  | { ok: false; motivo: string }

function extractJSON(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenceMatch) return fenceMatch[1].trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) return raw.slice(start, end + 1)
  return raw.trim()
}

function norm(s: string): string {
  return s.trim().toLowerCase()
}

/**
 * Genera la síntesis integrada del certificado: una sola llamada al LLM.
 * No escribe en la DB (responsabilidad del caller).
 *
 * Garantía anti-pérdida: filtramos `competenciasIntegradas` para quedarnos SOLO
 * con nombres que existen de verdad en las competencias técnicas provistas (por
 * si el LLM alucina). El caller calcula las NO integradas = provistas − estas.
 */
export async function generarSintesisCertificado(ctx: SintesisContext): Promise<SintesisResult> {
  const { systemPrompt, userPrompt } = buildSintesisPrompts(ctx)

  let result
  try {
    result = await aiProvider.generate({
      systemPrompt,
      userPrompt,
      responseFormat: 'json',
      maxTokens: 1200,
      temperature: 0.6,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido del proveedor de IA.'
    console.error('[certificado/sintesis] Error al llamar al proveedor:', msg)
    return { ok: false, motivo: msg }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(extractJSON(result.content))
  } catch {
    console.error('[certificado/sintesis] Respuesta no es JSON válido:', result.content.slice(0, 300))
    return { ok: false, motivo: 'El modelo no respondió con JSON válido. Intentá de nuevo.' }
  }

  const p = parsed as { perfilIntegrado?: unknown; competenciasIntegradas?: unknown }
  if (typeof p.perfilIntegrado !== 'string' || p.perfilIntegrado.trim().length === 0) {
    return { ok: false, motivo: 'El modelo no devolvió el perfil integrado. Intentá de nuevo.' }
  }

  // Solo aceptamos nombres de competencias que existen realmente en el input.
  const catalogo = new Map(ctx.competenciasTecnicas.map(c => [norm(c), c]))
  const integradas = Array.isArray(p.competenciasIntegradas)
    ? Array.from(
        new Set(
          p.competenciasIntegradas
            .filter((x): x is string => typeof x === 'string')
            .map(x => catalogo.get(norm(x)))
            .filter((x): x is string => x !== undefined),
        ),
      )
    : []

  const sintesis: CertificadoSintesisJSON = {
    perfilIntegrado: p.perfilIntegrado.trim(),
    competenciasIntegradas: integradas,
    generadaAt: new Date().toISOString(),
  }

  console.info(
    `[certificado/sintesis] Generada con ${result.model}. ` +
      `Tokens: ${result.usage.inputTokens} in + ${result.usage.outputTokens} out.`,
  )

  return {
    ok: true,
    sintesis,
    tokens: { input: result.usage.inputTokens, output: result.usage.outputTokens },
    modelo: result.model,
  }
}

/** Competencias técnicas provistas que el LLM NO integró en la prosa (van al final, textuales). */
export function competenciasNoIntegradas(todas: string[], integradas: string[]): string[] {
  const set = new Set(integradas.map(norm))
  return todas.filter(c => !set.has(norm(c)))
}
