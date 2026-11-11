import 'server-only'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server-admin'

/**
 * El certificado emitido es una foto firmada del perfil técnico: cualquier
 * cambio de formación, cursos, experiencia, idiomas o competencias lo deja
 * desactualizado. Acá solo prendemos el flag (una escritura, sin LLM); regenerar la
 * síntesis y re-emitir el PDF queda a cargo del botón "Actualizar certificado"
 * en /postulante/certificado. Mismo patrón que eneagrama.
 *
 * Se usa createAdminClient() porque certificado_pdf está cerrada a escritura de
 * usuarios por diseño (migración archivada 20260924000007_restringir_escritura_informe_certificado.sql).
 */
export async function marcarCambioPerfilTecnico(postulanteId: string | null): Promise<void> {
  if (postulanteId) {
    const admin = createAdminClient()
    const { error } = await admin
      .from('certificado_pdf')
      .update({ desactualizado: true })
      .eq('postulante_id', postulanteId)
    if (error) {
      console.error('[perfil-tecnico] No se pudo marcar el certificado desactualizado:', error.message)
    }
  }
  revalidatePath('/postulante/perfil')
  revalidatePath('/postulante/certificado')
}

export async function marcarCertificadosDesactualizados(postulanteIds: string[]): Promise<void> {
  if (postulanteIds.length === 0) return
  const admin = createAdminClient()
  const { error } = await admin
    .from('certificado_pdf')
    .update({ desactualizado: true })
    .in('postulante_id', postulanteIds)
  if (error) {
    console.error('[perfil-tecnico] No se pudieron marcar los certificados desactualizados:', error.message)
  }
  revalidatePath('/postulante/perfil')
  revalidatePath('/postulante/certificado')
}
