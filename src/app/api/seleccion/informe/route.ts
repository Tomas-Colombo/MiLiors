import { type NextRequest } from 'next/server'
import { generarInformeSeleccion } from '@/modules/seleccion/service'
import { generarInformeSeleccionPDFBuffer } from '@/modules/seleccion/generate-pdf'

export const maxDuration = 300

/**
 * Genera y descarga el informe de selección grupal de un puesto como PDF.
 * Recibe la lista de candidatos (favoritos depurados en el cliente), consulta
 * la IA y devuelve el PDF. Nada se persiste: el informe es efímero.
 */
export async function POST(req: NextRequest) {
  let body: { puestoId?: string; postulanteIds?: string[] }
  try {
    body = await req.json()
  } catch {
    return new Response('Cuerpo de la solicitud inválido.', { status: 400 })
  }

  const puestoId = body.puestoId
  const postulanteIds = body.postulanteIds

  if (typeof puestoId !== 'string' || !puestoId) {
    return new Response('Falta el puesto.', { status: 400 })
  }
  if (!Array.isArray(postulanteIds) || postulanteIds.some((id) => typeof id !== 'string')) {
    return new Response('Lista de candidatos inválida.', { status: 400 })
  }

  const resultado = await generarInformeSeleccion(puestoId, postulanteIds)
  if (!resultado.success) {
    return new Response(resultado.error, { status: resultado.status })
  }

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generarInformeSeleccionPDFBuffer({
      informe: resultado.informe,
      tituloPuesto: resultado.tituloPuesto,
      fechaGeneracion: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[seleccion/informe] Error generando PDF:', err)
    return new Response('No se pudo generar el PDF.', { status: 500 })
  }

  const nombreArchivo = `Informe-Seleccion-${resultado.tituloPuesto.replace(/\s+/g, '-')}.pdf`

  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(nombreArchivo)}"`,
      'Cache-Control': 'no-store',
    },
  })
}
