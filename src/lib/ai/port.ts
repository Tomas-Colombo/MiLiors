/**
 * Puerto de IA — interfaz abstracta que desacopla el dominio del proveedor.
 *
 * Para cambiar de proveedor (OpenAI → Claude → Gemini, etc.):
 *   1. Crear un nuevo adaptador en src/lib/ai/adapters/
 *   2. Cambiar la exportación en src/lib/ai/index.ts
 *   3. Nada más — el resto del código no toca.
 */

export interface GenerateOptions {
  /** Prompt del sistema (instrucciones de rol y formato) */
  systemPrompt: string
  /** Prompt del usuario (datos del postulante) */
  userPrompt: string
  /** Límite de tokens de salida */
  maxTokens?: number
  /** Temperatura (0 = determinista, 1 = creativo) */
  temperature?: number
}

export interface GenerateResult {
  /** Texto generado */
  content: string
  /** Tokens consumidos (para métricas de costo) */
  usage: {
    inputTokens: number
    outputTokens: number
  }
  /** Modelo exacto utilizado (para logging) */
  model: string
}

/**
 * Contrato que todo adaptador de IA debe implementar.
 */
export interface AIProvider {
  /**
   * Genera texto a partir de un prompt.
   * Lanza un error si el proveedor falla — el llamador decide cómo reintentar.
   */
  generate(options: GenerateOptions): Promise<GenerateResult>
}
