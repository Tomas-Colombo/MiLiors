import { type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { createClient } from '@/lib/supabase/server'
import { construirPropsCertificado } from '@/modules/certificado/pdf-props'
import { generarPDFBuffer } from '@/modules/certificado/generate-pdf'

export const maxDuration = 60

/**
 * Descarga el certificado del postulante autenticado.
 *
 * El PDF no se almacena en ningún lado: se arma acá, en cada descarga, desde el
 * perfil vigente —igual que el informe—, así lo que baja siempre trae el diseño
 * y los datos actuales. Lo único que queda congelado del certificado es su
 * identidad: el ID que verifica el QR y la fecha de firma, que salen de la fila
 * de `certificado_pdf` y se le pasan al render.
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
    .select('postulante_id, timestamp_firma')
    .eq('id', id)
    .single()

  if (!cert) {
    return new Response('Certificado no encontrado', { status: 404 })
  }

  const certTyped = cert as { postulante_id: string; timestamp_firma: string }

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

  // Render con el ID y la firma originales. Sin copia de respaldo: si esto
  // falla es un problema del render o del perfil, y devolver un PDF viejo
  // guardado en otro momento sería entregar un documento distinto al vigente.
  try {
    const contenido = await construirPropsCertificado({
      postulanteId: certTyped.postulante_id,
      certificadoId: id,
      timestampFirma: certTyped.timestamp_firma,
    })

    if (!contenido.success) {
      console.warn('[certificado/descargar] No se pudo re-renderizar:', contenido.error)
      return new Response('No se pudo generar el certificado', { status: 500 })
    }

    const pdfBuffer = await generarPDFBuffer(contenido.props)
    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(nombreArchivo)}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[certificado/descargar] Error re-renderizando el PDF:', err)
    return new Response('No se pudo generar el certificado', { status: 500 })
  }
}
