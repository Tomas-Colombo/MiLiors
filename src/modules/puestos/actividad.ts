import 'server-only'
import { createAdminClient } from '@/lib/supabase/server-admin'

/**
 * Marca actividad del reclutador sobre un puesto: `fecha_ultima_actividad = now()`.
 *
 * Es la señal que consume el cierre automático por inactividad (la función SQL
 * `cerrar_puestos_inactivos()` corrida a diario por pg_cron). Se llama cada vez
 * que el reclutador toca un puesto: ver una postulación, cambiar su estado,
 * guardar una nota privada de un candidato del puesto, o editar el puesto.
 *
 * Best-effort: usa admin client (la marca es un efecto secundario y el llamador
 * ya validó permisos/propiedad) y nunca lanza — si falla, se loguea y la acción
 * principal continúa. Acepta null/undefined para simplificar los call sites.
 */
export async function marcarActividadPuesto(puestoId: string | null | undefined): Promise<void> {
  if (!puestoId) return
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('puesto') as any)
    .update({ fecha_ultima_actividad: new Date().toISOString() })
    .eq('id', puestoId)
  if (error) {
    console.error('[actividad-puesto] No se pudo marcar actividad del puesto', puestoId, error)
  }
}
