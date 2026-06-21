/**
 * Punto de inyección del proveedor de IA activo.
 *
 * Para cambiar de proveedor:
 *   - Importar el nuevo adaptador y asignarlo a `aiProvider`.
 *   - El resto de la app no necesita cambios.
 *
 * Ejemplo para cambiar a Claude:
 *   import { claudeAdapter } from './adapters/claude'
 *   export const aiProvider = claudeAdapter
 */
import { openAIAdapter } from './adapters/openai'
import type { AIProvider } from './port'

export const aiProvider: AIProvider = openAIAdapter

// Re-exportar tipos para que los consumidores no necesiten importar desde port.ts
export type { AIProvider, GenerateOptions, GenerateResult } from './port'
