import { ESTADO_POSTULACION, type EstadoPostulacionKey } from '@/lib/constants/enums'

export const ORIGENES_VALIDOS_VISTO: readonly EstadoPostulacionKey[] = [
  ESTADO_POSTULACION.ENVIADA,
]

export const ORIGENES_VALIDOS_NO_AVANZAR: readonly EstadoPostulacionKey[] = [
  ESTADO_POSTULACION.ENVIADA,
  ESTADO_POSTULACION.VISTO,
]

export const ORIGENES_VALIDOS_REVERTIR_DESCARTE: readonly EstadoPostulacionKey[] = [
  ESTADO_POSTULACION.PROCESO_FINALIZADO,
]

export const ORIGENES_VALIDOS_MARCAR: readonly EstadoPostulacionKey[] = [
  ESTADO_POSTULACION.ENVIADA,
  ESTADO_POSTULACION.VISTO,
  ESTADO_POSTULACION.PROCESO_FINALIZADO,
]

export function esOrigenValidoVisto(estado: string): boolean {
  return (ORIGENES_VALIDOS_VISTO as readonly string[]).includes(estado)
}

export function esOrigenValidoNoAvanzar(estado: string): boolean {
  return (ORIGENES_VALIDOS_NO_AVANZAR as readonly string[]).includes(estado)
}

export function esOrigenValidoRevertirDescarte(estado: string): boolean {
  return (ORIGENES_VALIDOS_REVERTIR_DESCARTE as readonly string[]).includes(estado)
}

export function esOrigenValidoMarcar(estado: string): boolean {
  return (ORIGENES_VALIDOS_MARCAR as readonly string[]).includes(estado)
}
