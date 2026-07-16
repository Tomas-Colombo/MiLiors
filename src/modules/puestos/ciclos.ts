import 'server-only'
import { createAdminClient } from '@/lib/supabase/server-admin'

/**
 * Ciclo abierto de un puesto: la fila de `historial_puesto` con `fecha_fin IS NULL`.
 *
 * Un puesto que recibe postulaciones tiene siempre exactamente uno: `registrarApertura`
 * lo abre al publicar y al reactivar, y el cierre (a mano o por inactividad) lo cierra.
 * Que devuelva null significa que el puesto no está en ningún ciclo vigente y por lo
 * tanto no admite postulaciones nuevas.
 *
 * Las postulaciones cuelgan del ciclo, no del puesto: así una reapertura arranca con
 * el tablero limpio sin borrar el historial, y quien postuló en un ciclo anterior
 * puede volver a aplicar en el nuevo.
 */
export async function getCicloAbierto(puestoId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('historial_puesto')
    .select('id')
    .eq('puesto_id', puestoId)
    .is('fecha_fin', null)
    .order('fecha_inicio', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data as { id: string } | null)?.id ?? null
}

/**
 * Último ciclo del puesto, esté abierto o cerrado.
 *
 * Es el ciclo "relevante" cuando el puesto ya no recibe postulaciones: al eliminar
 * un puesto que estaba cerrado, la contratación y el tablero pertenecen igual a su
 * último ciclo, no a uno nuevo.
 */
export async function getCicloMasReciente(puestoId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('historial_puesto')
    .select('id')
    .eq('puesto_id', puestoId)
    .order('fecha_inicio', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data as { id: string } | null)?.id ?? null
}
