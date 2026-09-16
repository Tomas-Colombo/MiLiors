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
  /**
   * Formato de respuesta esperado.
   * 'json' → el proveedor puede activar JSON mode (mejor para informes estructurados).
   * 'text' → texto plano (por defecto para el asistente conversacional).
   */
  responseFormat?: 'json' | 'text'
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
 * Por qué falló el proveedor, en términos del dominio y no de un proveedor
 * concreto. El adaptador traduce el error crudo a una de estas categorías; el
 * dominio decide con eso si reintenta y qué le muestra al usuario.
 */
export type AIErrorKind =
  /** El modelo está saturado (503). Transitorio: reintentar suele alcanzar. */
  | 'sobrecargado'
  /** Límite de pedidos por minuto o cuota momentánea (429). Transitorio. */
  | 'limite'
  /** Cualquier otro 5xx del proveedor. Transitorio. */
  | 'servidor'
  /** La respuesta no entró en el presupuesto de tokens. No lo arregla un reintento. */
  | 'truncado'
  /** Falta la credencial, o el modelo/pedido es inválido. No lo arregla un reintento. */
  | 'configuracion'
  | 'desconocido'

/**
 * Error del proveedor ya clasificado.
 *
 * Existe para que el dominio no tenga que leer el JSON crudo de un proveedor
 * para decidir si reintenta: ese JSON es un detalle del adaptador y además no
 * se le puede mostrar a un usuario.
 */
export class AIError extends Error {
  constructor(
    readonly kind: AIErrorKind,
    /** `true` si volver a intentar tiene sentido. */
    readonly transitorio: boolean,
    /** Mensaje crudo del proveedor — para el log, nunca para la pantalla. */
    message: string,
  ) {
    super(message)
    this.name = 'AIError'
  }
}

/**
 * Contrato que todo adaptador de IA debe implementar.
 */
export interface AIProvider {
  /**
   * Genera texto a partir de un prompt.
   * Lanza `AIError` si el proveedor falla — el llamador decide cómo reintentar.
   */
  generate(options: GenerateOptions): Promise<GenerateResult>
}
