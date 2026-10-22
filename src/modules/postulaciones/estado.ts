import 'server-only'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { ESTADO_POSTULACION } from '@/lib/constants/enums'

/**
 * Pasa una postulación de ENVIADA a VISTO al abrir el perfil del candidato.
 *
 * Existe aparte de `avanzarEstadoPostulacion` porque esa es una server action
 * y llama a `revalidatePath`, que Next prohíbe durante el render de un Server
 * Component (error E7: la pantalla entera cae al error boundary). Acá no hace
 * falta revalidar: el listado de postulaciones es dinámico y se vuelve a pedir
 * al navegar.
 *
 * Quien llama ya verificó que la postulación pertenece a un puesto del
 * reclutador y marcó la actividad del puesto.
 */
export async function marcarPostulacionVista(postulacionId: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from('postulacion')
    .update({ estado: ESTADO_POSTULACION.VISTO })
    .eq('id', postulacionId)
    .eq('estado', ESTADO_POSTULACION.ENVIADA)
  if (error) {
    console.error('[postulacion] No se pudo marcar como vista', postulacionId, error)
  }
}
