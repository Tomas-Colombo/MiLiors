import 'server-only'
import { GoogleGenAI } from '@google/genai'
import type { AIProvider, GenerateOptions, GenerateResult } from '../port'

let client: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables.')
    }
    client = new GoogleGenAI({ apiKey })
  }
  return client
}

export const geminiAdapter: AIProvider = {
  async generate({ systemPrompt, userPrompt, maxTokens = 2000, temperature = 0.7 }: GenerateOptions): Promise<GenerateResult> {
    const ai = getClient()
    const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'

    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: maxTokens,
        temperature,
        responseMimeType: 'application/json',
      },
    })

    const candidate = response.candidates?.[0]
    const finishReason = candidate?.finishReason

    if (finishReason === 'MAX_TOKENS') {
      throw new Error(
        `Gemini stopped early: output was truncated (MAX_TOKENS). ` +
        `Used ${response.usageMetadata?.candidatesTokenCount ?? '?'} tokens. ` +
        `Increase maxTokens or reduce the prompt.`
      )
    }

    const text = response.text
    if (!text) {
      throw new Error('Gemini returned an empty response.')
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
