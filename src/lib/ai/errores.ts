import { AIError, type AIErrorKind } from './port'

/**
 * Qué se le dice al usuario cuando el proveedor de IA falla, y cuánto esperar
 * antes de reintentar.
 *
 * Vive acá y no en cada módulo porque el informe y el certificado enfrentan los
 * mismos fallos: un 503 de Gemini no es "un problema del informe", es un
 * problema del proveedor. Cuando el copy estaba duplicado, arreglarlo en un
 * lado dejaba el otro mostrando el JSON crudo en inglés.
 */

/** Frases cerradas, en castellano, listas para mostrar en pantalla. */
export const MENSAJE_POR_ERROR: Record<AIErrorKind, string> = {
  sobrecargado: 'El servicio de IA está sobrecargado en este momento. Probá de nuevo en unos minutos.',
  limite: 'Se alcanzó el límite de pedidos al servicio de IA. Esperá un momento y probá de nuevo.',
  servidor: 'El servicio de IA tuvo un problema momentáneo. Probá de nuevo en unos minutos.',
  truncado: 'El texto quedó demasiado largo para generarse de una vez. Avisale al equipo de MiLiors.',
  configuracion: 'El servicio de IA no está configurado correctamente. Avisale al equipo de MiLiors.',
  desconocido: 'El servicio de IA no respondió como se esperaba. Probá de nuevo.',
}

export type FalloProveedor = {
  kind: AIErrorKind
  /** Frase para el usuario. */
  motivo: string
  /** `true` si volver a intentar tiene sentido. */
  transitorio: boolean
  /** Mensaje crudo del proveedor — para el log, nunca para la pantalla. */
  crudo: string
}

/**
 * Normaliza cualquier cosa que haya sido lanzada a algo con lo que se puede
 * decidir. Un error que no llegó clasificado no se reintenta: sin saber qué
 * pasó, gastar otra llamada es apostar.
 */
export function interpretarFallo(err: unknown): FalloProveedor {
  const crudo = err instanceof Error ? err.message : String(err)
  const kind: AIErrorKind = err instanceof AIError ? err.kind : 'desconocido'
  const transitorio = err instanceof AIError ? err.transitorio : false
  return { kind, motivo: MENSAJE_POR_ERROR[kind], transitorio, crudo }
}

/**
 * Pausa antes de reintentar un fallo transitorio. Un 503 es un pico de demanda:
 * reintentar en el mismo milisegundo cae en el mismo pico.
 */
export const ESPERA_REINTENTO_MS = 1500

export function esperar(ms: number = ESPERA_REINTENTO_MS): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
