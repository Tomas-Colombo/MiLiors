import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { getUsuarioAutenticado } from '@/lib/supabase/claims'
import { borrarDestino, leerDestino } from '@/lib/destino-cookie'
import { tokenDeDestinoEmpleos } from '@/lib/sanitizar-next'
import { getPuestoPorEnlace } from './queries'

/**
 * Tras postularse con éxito, borra la cookie `miliors-destino` si era de ESTE puesto
 * (la de otro puesto sigue valiendo) o si apunta a un link /empleos que ya no
 * resuelve (regenerado o puesto dado de baja). Sólo desde una server action.
 */
export async function limpiarDestinoDePuesto(puestoId: string): Promise<void> {
  try {
    const usuario = await getUsuarioAutenticado(await createClient())
    const destino = await leerDestino(usuario?.id ?? null)
    if (!destino) return

    if (destino.startsWith(`/postulante/puestos/${puestoId}`)) {
      await borrarDestino()
      return
    }

    const token = tokenDeDestinoEmpleos(destino)
    if (token) {
      const puesto = await getPuestoPorEnlace(token)
      if (!puesto || puesto.puestoId === puestoId) await borrarDestino()
    }
  } catch (error) {
    // Es un detalle de UX: la postulación ya se registró, no puede fallar por esto.
    console.error('[postulaciones] No se pudo limpiar el destino guardado:', error)
  }
}
