/**
 * Cuota de generación de informes de selección por reclutador (H-221).
 *
 * Vive fuera de archivos con 'use server' o route handlers para ser una
 * función pura testeable sin dependencias de entorno. La ventana del día es de
 * 24 h corridas, no el día calendario: así no depende de la zona horaria.
 */

import { evaluarCuota, type CuotaResultado } from '@/lib/ai/cuota'

export const LIMITE_INFORMES_HORA = 5
export const LIMITE_INFORMES_DIA = 20

export type CuotaInformeResultado = CuotaResultado

export function evaluarCuotaInforme(conteoHora: number, conteoDia: number): CuotaInformeResultado {
  return evaluarCuota(conteoHora, conteoDia, {
    limiteHora: LIMITE_INFORMES_HORA,
    limiteDia: LIMITE_INFORMES_DIA,
    etiqueta: 'informes de selección',
  })
}
