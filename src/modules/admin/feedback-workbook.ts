import 'server-only'
import type ExcelJS from 'exceljs'
import {
  C,
  aBuffer,
  estilarFilas,
  fecha,
  nuevoLibro,
  prepararHoja,
} from './xlsx-estilo'
import {
  agregarPorCompetencia,
  agregarPorCompetenciaYNivel,
  diagnosticoSesgo,
  type FeedbackCompetenciaRow,
  type FeedbackGlobalRow,
} from './queries'

/**
 * Reporte de feedback del informe, en un solo .xlsx de cuatro hojas.
 *
 * El grano crudo (una fila por valoración, 13 por postulante) responde mal la
 * única pregunta que se le hace a este archivo: qué competencia está mal
 * calibrada y qué hacer al respecto. Así que las tres primeras hojas son
 * agregados listos para leer, y el detalle queda al final para quien quiera
 * rehacer la cuenta.
 *
 * Orden deliberado: cada hoja responde una pregunta y la siguiente profundiza
 * la anterior.
 *   1. Resumen    — ¿qué competencia está descalibrada?
 *   2. Por nivel  — ¿en qué punto de la escala se descalibra?
 *   3. Comentarios— ¿qué dice la gente en sus palabras?
 *   4. Detalle    — el crudo, con etiquetas legibles.
 */

/**
 * El enum de la base en el vocabulario del reporte. Se lee desde el punto de
 * vista del MOTOR ("lo subestimó"), que es lo que el admin corrige; el
 * postulante ve la misma respuesta desde el suyo ("mi nivel es mayor").
 */
const VALORACION_LABEL: Record<string, string> = {
  SUBESTIMA: 'Subestimado',
  JUSTO: 'Correcto',
  SOBRESTIMA: 'Sobrestimado',
}

/** Semáforo del diagnóstico: verde calibrada, ámbar corregible, rojo urgente. */
function pintarDiagnostico(cell: ExcelJS.Cell, sesgo: number, diagnostico: string): void {
  const severo = Math.abs(sesgo) >= 30 || diagnostico.startsWith('Polarizada')
  const leve = Math.abs(sesgo) >= 15
  const [texto, fondo] = severo
    ? [C.error, C.errorBg]
    : leve
      ? [C.warning, C.warningBg]
      : [C.success, C.successBg]
  cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: texto } }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fondo } }
}

export type FeedbackWorkbookInput = {
  valoraciones: FeedbackCompetenciaRow[]
  globales: FeedbackGlobalRow[]
  /** Descripción legible de los filtros aplicados, para que el archivo diga qué contiene. */
  filtrosDescripcion: string
  /**
   * `true` si la consulta tocó el techo de filas. Se estampa en el archivo: un
   * porcentaje calculado sobre una muestra recortada es peor que no tenerlo, y
   * quien lo abra tiene que saberlo sin mirar el código.
   */
  truncado?: boolean
}

export async function construirFeedbackWorkbook(input: FeedbackWorkbookInput): Promise<Buffer> {
  const { valoraciones, globales, truncado } = input
  const filtrosDescripcion = truncado
    ? `⚠ PARCIAL: se alcanzó el máximo de filas y estos números salen de una muestra recortada. Achicá el rango de fechas. ${input.filtrosDescripcion}`
    : input.filtrosDescripcion

  const wb = nuevoLibro()

  // ── Hoja 1 · Resumen ───────────────────────────────────────────────────────
  const resumen = wb.addWorksheet('Resumen', { properties: { tabColor: { argb: C.primary } } })
  prepararHoja(
    resumen,
    'Resumen por competencia',
    `Qué competencia está mal calibrada. Sesgo = % subestimado − % sobrestimado. Positivo: el motor se queda corto, subir su peso. Negativo: se pasa. ${filtrosDescripcion}`,
    [
      { header: 'Competencia', key: 'nombre', width: 30 },
      { header: 'Respuestas', key: 'total', width: 12 },
      { header: 'Subestimado', key: 'bajo', width: 14 },
      { header: 'Correcto', key: 'ok', width: 12 },
      { header: 'Sobrestimado', key: 'alto', width: 14 },
      { header: 'Sesgo', key: 'sesgo', width: 10 },
      { header: 'Qué hacer', key: 'accion', width: 30 },
    ],
  )

  for (const a of agregarPorCompetencia(valoraciones)) {
    const diagnostico = diagnosticoSesgo(a)
    const row = resumen.addRow({
      nombre: a.nombre,
      total: a.total,
      bajo: a.subestima / a.total,
      ok: a.justo / a.total,
      alto: a.sobrestima / a.total,
      sesgo: a.sesgo / 100,
      accion: diagnostico,
    })
    for (const key of ['bajo', 'ok', 'alto']) row.getCell(key).numFmt = '0%'
    // Con signo: el signo ES la lectura, y sin él hay que ir a buscar la leyenda.
    row.getCell('sesgo').numFmt = '+0%;-0%;0%'
    pintarDiagnostico(row.getCell('accion'), a.sesgo, diagnostico)
  }
  estilarFilas(resumen)

  // ── Hoja 2 · Por nivel ─────────────────────────────────────────────────────
  const porNivel = wb.addWorksheet('Por nivel', { properties: { tabColor: { argb: C.gold } } })
  prepararHoja(
    porNivel,
    'Competencia × nivel mostrado',
    `${truncado ? '⚠ PARCIAL: se alcanzó el máximo de filas. ' : ''}En qué punto de la escala se descalibra. Si una competencia sólo se queja cuando se muestra en Alto, el problema es el factor de contraste; si se queja parejo en todos los niveles, es su peso en la matriz eneatipo→competencia.`,
    [
      { header: 'Competencia', key: 'nombre', width: 30 },
      { header: 'Nivel mostrado', key: 'nivel', width: 16 },
      { header: 'Respuestas', key: 'total', width: 12 },
      { header: 'Subestimado', key: 'bajo', width: 14 },
      { header: 'Correcto', key: 'ok', width: 12 },
      { header: 'Sobrestimado', key: 'alto', width: 14 },
      { header: 'Sesgo', key: 'sesgo', width: 10 },
      { header: 'Qué hacer', key: 'accion', width: 30 },
    ],
  )

  for (const a of agregarPorCompetenciaYNivel(valoraciones)) {
    const diagnostico = diagnosticoSesgo(a)
    const row = porNivel.addRow({
      nombre: a.nombre,
      nivel: a.nivel,
      total: a.total,
      bajo: a.subestima / a.total,
      ok: a.justo / a.total,
      alto: a.sobrestima / a.total,
      sesgo: a.sesgo / 100,
      accion: diagnostico,
    })
    for (const key of ['bajo', 'ok', 'alto']) row.getCell(key).numFmt = '0%'
    row.getCell('sesgo').numFmt = '+0%;-0%;0%'
    pintarDiagnostico(row.getCell('accion'), a.sesgo, diagnostico)
  }
  estilarFilas(porNivel)

  // ── Hoja 3 · Comentarios ───────────────────────────────────────────────────
  const coments = wb.addWorksheet('Comentarios', { properties: { tabColor: { argb: C.success } } })
  prepararHoja(
    coments,
    'Comentarios y representatividad',
    'Respuestas a la pregunta de cierre del informe. La representatividad es cuánto dice el postulante que el informe lo describe (10% nada, 100% totalmente). Ordenado de menor a mayor: las quejas primero.',
    [
      { header: 'Representa', key: 'repr', width: 13 },
      { header: 'Comentario', key: 'comentario', width: 80 },
      { header: 'Eneatipo', key: 'eneatipo', width: 10 },
      { header: 'Respondido', key: 'fecha', width: 14 },
      { header: 'Postulante (seudónimo)', key: 'postulante', width: 24 },
    ],
  )

  // De menor a mayor representatividad: lo que hay que leer primero es lo que peor puntuó.
  const conComentario = globales
    .filter(g => g.comentario?.trim())
    .sort((a, b) => a.representatividad - b.representatividad)

  for (const g of conComentario) {
    const row = coments.addRow({
      repr: g.representatividad / 100,
      comentario: g.comentario,
      eneatipo: g.eneatipo ?? '—',
      fecha: fecha(g.respondidoAt),
      postulante: g.postulanteId,
    })
    row.getCell('repr').numFmt = '0%'
    row.getCell('fecha').numFmt = 'dd/mm/yyyy'
    row.getCell('comentario').alignment = { vertical: 'top', wrapText: true }
    // El texto libre es lo que se lee: que la fila crezca con él.
    row.height = Math.min(90, 15 * Math.ceil((g.comentario?.length ?? 0) / 90 || 1))

    const repr = row.getCell('repr')
    const [texto, fondo] =
      g.representatividad >= 70
        ? [C.success, C.successBg]
        : g.representatividad >= 40
          ? [C.warning, C.warningBg]
          : [C.error, C.errorBg]
    repr.font = { name: 'Calibri', size: 10, bold: true, color: { argb: texto } }
    repr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fondo } }
  }
  estilarFilas(coments)

  // ── Hoja 4 · Detalle ───────────────────────────────────────────────────────
  const detalle = wb.addWorksheet('Detalle', { properties: { tabColor: { argb: C.muted } } })
  prepararHoja(
    detalle,
    'Detalle de valoraciones',
    'Una fila por valoración: el grano crudo, por si querés rehacer las cuentas o cruzarlo con otra cosa. Seudónimo: el id permite agrupar las respuestas de una misma persona, nunca expone nombre ni email.',
    [
      { header: 'Competencia', key: 'competencia', width: 30 },
      { header: 'Nivel mostrado', key: 'nivel', width: 16 },
      { header: 'Qué respondió', key: 'valoracion', width: 17 },
      { header: 'Eneatipo', key: 'eneatipo', width: 10 },
      { header: 'Respondido', key: 'respondido', width: 14 },
      { header: 'Informe generado', key: 'generado', width: 16 },
      { header: 'Postulante (seudónimo)', key: 'postulante', width: 24 },
    ],
  )

  for (const v of valoraciones) {
    const row = detalle.addRow({
      competencia: v.competenciaNombre,
      nivel: v.nivelMostrado,
      valoracion: VALORACION_LABEL[v.valoracion] ?? v.valoracion,
      eneatipo: v.eneatipo ?? '—',
      respondido: fecha(v.respondidoAt),
      generado: fecha(v.informeGeneradoAt),
      postulante: v.postulanteId,
    })
    row.getCell('respondido').numFmt = 'dd/mm/yyyy'
    row.getCell('generado').numFmt = 'dd/mm/yyyy'
  }
  estilarFilas(detalle)

  return aBuffer(wb)
}
