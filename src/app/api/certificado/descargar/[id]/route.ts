import { type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { createClient } from '@/lib/supabase/server'
import { construirPropsCertificado } from '@/modules/certificado/pdf-props'
import { generarPDFBuffer } from '@/modules/certificado/generate-pdf'

export const maxDuration = 60

/**
 * Descarga el certificado del postulante autenticado.
 *
 * El PDF se re-renderiza en cada descarga desde el perfil vigente, igual que el
 * informe: así el archivo que baja siempre trae el diseño y los datos actuales.
 * Lo que queda congelado del certificado es su identidad —el ID de verificación
 * y la fecha de firma—, no el archivo. La copia de emisión sigue en Storage y
 * se usa como respaldo si la regeneración falla.
 */
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
    .select('url_archivo, postulante_id, timestamp_firma')
    .eq('id', id)
    .single()

  if (!cert) {
    return new Response('Certificado no encontrado', { status: 404 })
  }

  const certTyped = cert as { url_archivo: string; postulante_id: string; timestamp_firma: string }

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

  const nombreArchivo = `Certificado-MiLiors-${perfilTyped.nombre_completo.replace(/\s+/g, '-')}.pdf`

  // Re-render con el ID y la firma originales.
  try {
    const contenido = await construirPropsCertificado({
      postulanteId: certTyped.postulante_id,
      certificadoId: id,
      timestampFirma: certTyped.timestamp_firma,
    })

    if (contenido.success) {
      const pdfBuffer = await generarPDFBuffer(contenido.props)
      return new Response(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${encodeURIComponent(nombreArchivo)}"`,
          'Cache-Control': 'no-store',
        },
      })
    }
    console.warn('[certificado/descargar] No se pudo re-renderizar:', contenido.error)
  } catch (err) {
    console.error('[certificado/descargar] Error re-renderizando el PDF:', err)
  }

  // Respaldo: la copia de emisión guardada en Storage.
  const { data: signedUrl, error } = await admin.storage
    .from('certificados')
    .createSignedUrl(certTyped.url_archivo, 3600, { download: nombreArchivo })

  if (error || !signedUrl) {
    return new Response('No se pudo generar el enlace de descarga', { status: 500 })
  }

  return Response.redirect(signedUrl.signedUrl, 302)
}
