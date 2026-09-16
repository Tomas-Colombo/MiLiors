/**
 * Active AI provider injection point.
 *
 * To switch providers:
 *   - Import the new adapter and assign it to `aiProvider`.
 *   - Nothing else in the app needs to change.
 *
 * Example to switch to a different provider:
 *   import { myAdapter } from './adapters/my-provider'
 *   export const aiProvider = myAdapter
 */
import { geminiAdapter } from './adapters/gemini'
import type { AIProvider } from './port'

export const aiProvider: AIProvider = geminiAdapter

// Re-exportar tipos para que los consumidores no necesiten importar desde port.ts
export type { AIProvider, GenerateOptions, GenerateResult, AIErrorKind } from './port'
export { AIError } from './port'
