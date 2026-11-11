/**
 * Cuota de consultas al asistente por reclutador (H-221).
 *
 * Vive fuera de actions.ts a propósito: todo lo que exporta un archivo
 * 'use server' queda publicado como server action, y esta regla es lógica pura.
 * La ventana del día es de 24 h corridas, no el día calendario: así no depende
 * de la zona horaria.
 */

import { evaluarCuota, type CuotaResultado } from '@/lib/ai/cuota'

export const LIMITE_CONSULTAS_HORA = 20
export const LIMITE_CONSULTAS_DIA = 100

export type CuotaAsistenteResultado = CuotaResultado

export function evaluarCuotaAsistente(conteoHora: number, conteoDia: number): CuotaAsistenteResultado {
  return evaluarCuota(conteoHora, conteoDia, {
    limiteHora: LIMITE_CONSULTAS_HORA,
    limiteDia: LIMITE_CONSULTAS_DIA,
    etiqueta: 'consultas al asistente',
  })
}
