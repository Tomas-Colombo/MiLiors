import 'server-only'
import OpenAI from 'openai'
import type { AIProvider, GenerateOptions, GenerateResult } from '../port'

let client: OpenAI | null = null

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.LLM_API_KEY
    if (!apiKey) {
      throw new Error('LLM_API_KEY no está configurada en las variables de entorno.')
    }
    const baseURL = process.env.LLM_BASE_URL
    client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) })
  }
  return client
}

export const openAIAdapter: AIProvider = {
  async generate({ systemPrompt, userPrompt, maxTokens = 2000, temperature = 0.7 }: GenerateOptions): Promise<GenerateResult> {
    const openai = getClient()
    const model = process.env.LLM_MODEL
    if (!model) {
      throw new Error('LLM_MODEL no está configurada en las variables de entorno.')
    }

    const response = await openai.chat.completions.create({
      model,
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
