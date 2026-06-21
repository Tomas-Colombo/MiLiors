import 'server-only'
import OpenAI from 'openai'
import type { AIProvider, GenerateOptions, GenerateResult } from '../port'

// Modelo a usar. Cambiar aquí para actualizar en toda la app.
// gpt-4o-mini: económico, rápido, buena calidad para perfiles.
// gpt-4o: más preciso, más costo — usar si la calidad no alcanza.
const DEFAULT_MODEL = 'gpt-4o-mini'

let client: OpenAI | null = null

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY no está configurada en las variables de entorno.')
    }
    client = new OpenAI({ apiKey })
  }
  return client
}

export const openAIAdapter: AIProvider = {
  async generate({ systemPrompt, userPrompt, maxTokens = 2000, temperature = 0.7 }: GenerateOptions): Promise<GenerateResult> {
    const openai = getClient()

    const response = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature,
    })

    const choice = response.choices[0]
    if (!choice?.message?.content) {
      throw new Error('El proveedor de IA devolvió una respuesta vacía.')
    }

    return {
      content: choice.message.content,
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      },
      model: response.model,
    }
  },
}
