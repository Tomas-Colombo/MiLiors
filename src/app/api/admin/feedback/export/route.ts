import { type NextRequest } from 'next/server'
import { getSessionUser } from '@/lib/dal'
import {
  getFeedbackCompetenciasAdmin,
  getFeedbackGlobalAdmin,
  type FeedbackFiltros,
} from '@/modules/admin/queries'

/**
 * Exporta el feedback del informe como CSV para analizarlo fuera de la app
 * (Excel, pandas, R). Respeta exactamente los mismos filtros que la pantalla:
 * lo que se descarga es lo que se está viendo.
 *
 * Dos granos distintos, no mezclados en un archivo: `competencias` es una fila
 * por valoración (el grano que sirve para mover los pesos del motor) y `global`
 * una fila por informe. Cruzarlos duplicaría el comentario 13 veces y arruinaría
 * cualquier promedio hecho sobre el archivo.
 *
 * El export es SEUDÓNIMO: `postulante_id` permite agrupar sin exponer identidad.
 */

/**
 * Escapa un valor para CSV. El prefijo `'` en celdas que arrancan con =, +, - o @
 * neutraliza la inyección de fórmulas: `comentario` es texto libre del usuario y
 * este archivo se abre en Excel.
 */
function csvCell(value: string | number | null): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  const seguro = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  return `"${seguro.replace(/"/g, '""')}"`
}

function toCSV(headers: string[], rows: (string | number | null)[][]): string {
  const lineas = [headers.join(','), ...rows.map(r => r.map(csvCell).join(','))]
  // BOM: sin esto Excel abre el archivo en ANSI y rompe los acentos.
  return '﻿' + lineas.join('\r\n') + '\r\n'
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

  const tipo = sp.get('tipo') === 'global' ? 'global' : 'competencias'
  const hoy = new Date().toISOString().slice(0, 10)

  let csv: string
  let nombreArchivo: string

  if (tipo === 'global') {
    const rows = await getFeedbackGlobalAdmin(filtros)
    csv = toCSV(
      ['respondido_at', 'postulante_id', 'eneatipo', 'representatividad_pct', 'comentario'],
      rows.map(r => [r.respondidoAt, r.postulanteId, r.eneatipo, r.representatividad, r.comentario]),
    )
    nombreArchivo = `feedback-informe-global-${hoy}.csv`
  } else {
    const rows = await getFeedbackCompetenciasAdmin(filtros)
    csv = toCSV(
      [
        'respondido_at',
        'informe_generado_at',
        'postulante_id',
        'eneatipo',
        'competencia_key',
        'competencia',
        'nivel_mostrado',
        'valoracion',
      ],
      rows.map(r => [
        r.respondidoAt,
        r.informeGeneradoAt,
        r.postulanteId,
        r.eneatipo,
        r.competenciaKey,
        r.competenciaNombre,
        r.nivelMostrado,
        r.valoracion,
      ]),
    )
    nombreArchivo = `feedback-informe-competencias-${hoy}.csv`
  }

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nombreArchivo}"`,
      'Cache-Control': 'no-store',
    },
  })
}
