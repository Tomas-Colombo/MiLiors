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
  async generate({ systemPrompt, userPrompt, maxTokens = 2000, temperature = 0.7, responseFormat = 'json' }: GenerateOptions): Promise<GenerateResult> {
    const ai = getClient()
    const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'

    const response = await ai.models.generateContent({
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
