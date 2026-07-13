import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generarInformePDFBuffer } from '@/modules/informe/generate-pdf'
import type { InformePersonalidadJSON } from '@/lib/types/informe'

export const maxDuration = 60

/**
 * Descarga el informe de personalidad del postulante autenticado como PDF.
 * El PDF NO se almacena: se regenera on-demand desde `contenido_json`.
 */
export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('No autorizado', { status: 401 })

  const { data: postulante } = await supabase
    .from('perfil_postulante')
    .select('id')
    .eq('usuario_id', user.id)
    .single()

  if (!postulante) return new Response('Perfil no encontrado', { status: 404 })

  const { data: informe } = await supabase
    .from('informe_personalidad')
    .select('estado_informe, contenido_json, fecha_generacion')
    .eq('postulante_id', (postulante as { id: string }).id)
    .single()

  const informeTyped = informe as {
    estado_informe: string
    contenido_json: InformePersonalidadJSON | null
    fecha_generacion: string
  } | null

  if (!informeTyped || informeTyped.estado_informe !== 'LISTO' || !informeTyped.contenido_json) {
    return new Response('El informe no está disponible para descargar.', { status: 404 })
  }

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generarInformePDFBuffer({
      informe: informeTyped.contenido_json,
      email: user.email ?? undefined,
      fechaGeneracion: informeTyped.fecha_generacion,
    })
  } catch (err) {
    console.error('[informe/descargar] Error generando PDF:', err)
    return new Response('No se pudo generar el PDF.', { status: 500 })
  }

  const nombreArchivo = `Informe-Personalidad-${informeTyped.contenido_json.nombre.replace(/\s+/g, '-')}.pdf`

  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(nombreArchivo)}"`,
      'Cache-Control': 'no-store',
    },
  })
}
