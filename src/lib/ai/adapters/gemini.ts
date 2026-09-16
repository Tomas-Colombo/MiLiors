import 'server-only'
import { GoogleGenAI } from '@google/genai'
import { AIError, type AIProvider, type GenerateOptions, type GenerateResult } from '../port'

let client: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new AIError('configuracion', false, 'GEMINI_API_KEY is not set in environment variables.')
    }
    client = new GoogleGenAI({ apiKey })
  }
  return client
}

/**
 * Traduce el error crudo del SDK a una categoría del dominio.
 *
 * El SDK lanza un Error cuyo `message` es el JSON de la API, del estilo
 * `{"error":{"code":503,"status":"UNAVAILABLE",...}}`. Leerlo acá y no en el
 * dominio es lo que le permite al llamador decidir si reintenta sin saber nada
 * de Gemini — y evita que ese JSON termine en un cartel en pantalla.
 *
 * Se mira el código y el status por separado porque no siempre vienen los dos.
 */
export function clasificarErrorGemini(err: unknown): AIError {
  if (err instanceof AIError) return err

  const raw = err instanceof Error ? err.message : String(err)
  const code = Number(raw.match(/"code"\s*:\s*(\d+)/)?.[1] ?? NaN)
  const status = raw.match(/"status"\s*:\s*"([A-Z_]+)"/)?.[1] ?? ''

  if (code === 503 || status === 'UNAVAILABLE') return new AIError('sobrecargado', true, raw)
  if (code === 429 || status === 'RESOURCE_EXHAUSTED') return new AIError('limite', true, raw)
  if (Number.isFinite(code) && code >= 500) return new AIError('servidor', true, raw)
  if (code === 400 || code === 401 || code === 403) return new AIError('configuracion', false, raw)
  return new AIError('desconocido', false, raw)
}

export const geminiAdapter: AIProvider = {
  async generate({ systemPrompt, userPrompt, maxTokens = 2000, temperature = 0.7, responseFormat = 'json' }: GenerateOptions): Promise<GenerateResult> {
    const ai = getClient()
    const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'

    let response
    try {
      response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: maxTokens,
          temperature,
          // Only use JSON mode for structured outputs (e.g. personality report).
          // The conversational assistant returns plain text — JSON mode wastes tokens and may break formatting.
          ...(responseFormat === 'json' ? { responseMimeType: 'application/json' } : {}),
          // Disable thinking for non-reasoning tasks (assistant, report generation).
          // gemini-2.5-flash has thinking enabled by default — thinking tokens count against
          // maxOutputTokens and leave almost no budget for the actual response.
          thinkingConfig: { thinkingBudget: 0 },
        },
      })
    } catch (err) {
      throw clasificarErrorGemini(err)
    }

    const candidate = response.candidates?.[0]
    const finishReason = candidate?.finishReason

    if (finishReason === 'MAX_TOKENS') {
      throw new AIError(
        'truncado',
        false,
        `Gemini stopped early: output was truncated (MAX_TOKENS). ` +
          `Used ${response.usageMetadata?.candidatesTokenCount ?? '?'} tokens. ` +
          `Increase maxTokens or reduce the prompt.`,
      )
    }

    const text = response.text
    if (!text) {
      throw new AIError('desconocido', true, 'Gemini returned an empty response.')
    }

    return {
      content: text,
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      },
      model,
    }
  },
}
