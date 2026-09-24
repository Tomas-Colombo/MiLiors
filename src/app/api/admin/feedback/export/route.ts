import { type NextRequest } from 'next/server'
import { getSessionUser } from '@/lib/dal'
import {
  getFeedbackCompetenciasAdmin,
  getFeedbackSeccionesAdmin,
  getFeedbackGlobalAdmin,
  type FeedbackFiltros,
} from '@/modules/admin/queries'
import { LIMITE_FILAS_CONSULTA } from '@/modules/admin/queries'
import { normalizarTexto } from '@/lib/texto'
import { construirFeedbackWorkbook } from '@/modules/admin/feedback-workbook'
import { COMPETENCIAS, ENEATIPO_NOMBRES } from '@/modules/informe/competencias'

/**
 * Exporta el feedback del informe como un .xlsx de cuatro hojas. Respeta
 * exactamente los mismos filtros que la pantalla: lo que se descarga es lo que
 * se está viendo.
 *
 * Antes eran dos CSV con el grano crudo, uno por tabla. Volcaban 13 filas por
 * postulante con UUIDs, timestamps ISO y los nombres del enum (SUBESTIMA…), y
 * dejaban al lector la tarea de armarse la tabla dinámica para llegar a la
 * única pregunta que le hace a este archivo: qué competencia recalibrar. Ahora
 * eso ya viene resuelto y el crudo queda en la última hoja.
 *
 * El export es SEUDÓNIMO: `postulante_id` permite agrupar sin exponer identidad.
 */

const VALORACION_LABEL: Record<string, string> = {
  SUBESTIMA: 'subestimado',
  JUSTO: 'correcto',
  SOBRESTIMA: 'sobrestimado',
}

/**
 * Los filtros vigentes en castellano, para estampar en cada hoja. Un archivo
 * descargado se reenvía y se archiva: sin esto, dentro de dos meses nadie sabe
 * si esos números son de todo el histórico o de una semana suelta.
 */
function describirFiltros(f: FeedbackFiltros, busqueda: string): string {
  const partes: string[] = []
  if (busqueda) partes.push(`comentarios que dicen “${busqueda}”`)

  const eneatipo = parseInt(f.eneatipo ?? '', 10)
  if (Number.isFinite(eneatipo)) {
    partes.push(`eneatipo ${eneatipo} (${ENEATIPO_NOMBRES[eneatipo] ?? '—'})`)
  }
  if (f.competencia) {
    partes.push(COMPETENCIAS.find(c => c.key === f.competencia)?.nombre ?? f.competencia)
  }
  if (f.nivel) partes.push(`nivel mostrado ${f.nivel}`)
  if (f.valoracion) partes.push(`nivel ${VALORACION_LABEL[f.valoracion] ?? f.valoracion}`)

  if (f.desde || f.hasta) {
    if (f.desde && f.hasta) partes.push(`del ${f.desde} al ${f.hasta}`)
    else if (f.desde) partes.push(`desde el ${f.desde}`)
    else partes.push(`hasta el ${f.hasta}`)
  } else if (f.dias) {
    partes.push(`últimos ${f.dias} días`)
  }

  return partes.length === 0
    ? 'Incluye todo el histórico, sin filtros.'
    : `Filtrado por: ${partes.join(' · ')}.`
}

export async function GET(req: NextRequest) {
  const session = await getSessionUser()
  if (!session) return new Response('No autorizado', { status: 401 })
  if (session.rol !== 'ADMIN') return new Response('Prohibido', { status: 403 })

  const sp = req.nextUrl.searchParams
  const filtros: FeedbackFiltros = {
    eneatipo: sp.get('eneatipo') ?? undefined,
    competencia: sp.get('competencia') ?? undefined,
    nivel: sp.get('nivel') ?? undefined,
    valoracion: sp.get('valoracion') ?? undefined,
    dias: sp.get('dias') ?? undefined,
    desde: sp.get('desde') ?? undefined,
    hasta: sp.get('hasta') ?? undefined,
  }

  // El buscador de comentarios vive aparte de `filtros` porque sólo alcanza a
  // ese listado, pero tiene que viajar igual: si la pantalla muestra 3
  // comentarios, el archivo no puede traer 300.
  const busqueda = (sp.get('qC') ?? '').trim()

  const [secciones, valoraciones, todosLosGlobales] = await Promise.all([
    getFeedbackSeccionesAdmin(filtros),
    getFeedbackCompetenciasAdmin(filtros),
    getFeedbackGlobalAdmin(filtros),
  ])

  const globales = busqueda
    ? todosLosGlobales.filter(g => g.comentario
        ? normalizarTexto(g.comentario).includes(normalizarTexto(busqueda))
        : false)
    : todosLosGlobales

  const truncado =
    secciones.length >= LIMITE_FILAS_CONSULTA ||
    valoraciones.length >= LIMITE_FILAS_CONSULTA ||
    todosLosGlobales.length >= LIMITE_FILAS_CONSULTA

  let xlsx: Buffer
  try {
    xlsx = await construirFeedbackWorkbook({
      secciones,
      valoraciones,
      globales,
      filtrosDescripcion: describirFiltros(filtros, busqueda),
      truncado,
    })
  } catch (err) {
    console.error('[admin/feedback/export] No se pudo generar el .xlsx:', err)
    return new Response('No se pudo generar el archivo.', { status: 500 })
  }

  const hoy = new Date().toISOString().slice(0, 10)
  const nombreArchivo = `feedback-informe-${hoy}.xlsx`

  return new Response(new Uint8Array(xlsx), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
      'Cache-Control': 'no-store',
    },
  })
}
