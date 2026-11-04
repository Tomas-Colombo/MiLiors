/**
 * Cuota de consultas al asistente por reclutador (H-221).
 *
 * Vive fuera de actions.ts a propósito: todo lo que exporta un archivo
 * 'use server' queda publicado como server action, y esta regla es lógica pura.
 * La ventana del día es de 24 h corridas, no el día calendario: así no depende
 * de la zona horaria.
 */

export const LIMITE_CONSULTAS_HORA = 20
export const LIMITE_CONSULTAS_DIA = 100

export type CuotaAsistenteResultado =
  | { permitida: true }
  | { permitida: false; error: string }

export function evaluarCuotaAsistente(conteoHora: number, conteoDia: number): CuotaAsistenteResultado {
  if (conteoHora >= LIMITE_CONSULTAS_HORA) {
    return {
      permitida: false,
      error: `Alcanzaste el límite de consultas al asistente (${LIMITE_CONSULTAS_HORA} por hora). Probá de nuevo más tarde.`,
    }
  }
  if (conteoDia >= LIMITE_CONSULTAS_DIA) {
    return {
      permitida: false,
      error: `Alcanzaste el límite de consultas al asistente (${LIMITE_CONSULTAS_DIA} por día). Probá de nuevo más tarde.`,
    }
  }
  return { permitida: true }
}
