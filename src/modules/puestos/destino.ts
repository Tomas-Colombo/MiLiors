import 'server-only'
import { borrarDestino, leerDestino } from '@/lib/destino-cookie'
import { tokenDeDestinoEmpleos } from '@/lib/sanitizar-next'
import { getPuestoPorEnlace } from './queries'

/** ¿El destino guardado apunta a este puesto (por link o por detalle del postulante)? */
async function destinoEsDelPuesto(destino: string, puestoId: string): Promise<boolean> {
  if (destino.startsWith(`/postulante/puestos/${puestoId}`)) return true

  const token = tokenDeDestinoEmpleos(destino)
  if (token) return (await getPuestoPorEnlace(token))?.puestoId === puestoId

  return false
}

/**
 * Tras postularse con éxito, borra la cookie `miliors-destino` si era de ESTE puesto
 * (la de otro puesto sigue valiendo). Sólo desde una server action.
 */
export async function limpiarDestinoDePuesto(puestoId: string): Promise<void> {
  try {
    const destino = await leerDestino()
    if (destino && (await destinoEsDelPuesto(destino, puestoId))) await borrarDestino()
  } catch (error) {
    // Es un detalle de UX: la postulación ya se registró, no puede fallar por esto.
    console.error('[postulaciones] No se pudo limpiar el destino guardado:', error)
  }
}
