import { type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  // Verify session
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return new Response('No autorizado', { status: 401 })
  }

  const admin = createAdminClient()

  // Get the certificate and verify it exists
  const { data: cert } = await admin
    .from('certificado_pdf')
    .select('url_archivo, postulante_id')
    .eq('id', id)
    .single()

  if (!cert) {
    return new Response('Certificado no encontrado', { status: 404 })
  }

  const certTyped = cert as { url_archivo: string; postulante_id: string }

  // Verify ownership
  const { data: perfil } = await admin
    .from('perfil_postulante')
    .select('usuario_id, nombre_completo')
    .eq('id', certTyped.postulante_id)
    .single()

  const perfilTyped = perfil as { usuario_id: string; nombre_completo: string } | null
  if (!perfilTyped || perfilTyped.usuario_id !== user.id) {
    return new Response('No autorizado', { status: 403 })
  }

  // Generate signed URL (1 hour). `download` fuerza la descarga directa
  // (Content-Disposition: attachment) en vez de previsualizar el PDF.
  const nombreArchivo = `Certificado-TalentID-${perfilTyped.nombre_completo.replace(/\s+/g, '-')}.pdf`
  const { data: signedUrl, error } = await admin.storage
    .from('certificados')
    .createSignedUrl(certTyped.url_archivo, 3600, { download: nombreArchivo })

  if (error || !signedUrl) {
    return new Response('No se pudo generar el enlace de descarga', { status: 500 })
  }

  return Response.redirect(signedUrl.signedUrl, 302)
}
