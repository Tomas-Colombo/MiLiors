import 'server-only'
import ExcelJS from 'exceljs'

/**
 * Estilo compartido de los .xlsx de admin.
 *
 * Vive aparte para que todos los exports se vean como la misma aplicación y no
 * como cinco archivos hechos por cinco personas: misma cabecera de marca, mismo
 * zebrado, mismos títulos congelados. Si mañana cambia el azul de la app, se
 * cambia acá y no en cada reporte.
 */

// Paleta de la app (globals.css) en ARGB, que es lo que entiende OOXML.
export const C = {
  primary: 'FF2564DC', // --color-primary-600
  primaryTint: 'FFE7EFFD', // --color-primary-tint
  ghost: 'FFF3F7FE', // --color-primary-ghost-hover, para el zebrado
  gold: 'FFC79A3F', // --color-gold-600
  success: 'FF16A34A', // --color-success
  successBg: 'FFE3F7ED',
  warning: 'FFB7791F', // --color-warning
  warningBg: 'FFFEF1DC',
  error: 'FFC8312B', // --color-error
  errorBg: 'FFFBE6E5',
  ink: 'FF1A1D29',
  muted: 'FF6B7085',
  borde: 'FFE4E7EE',
  blanco: 'FFFFFFFF',
} as const

export type Col = { header: string; key: string; width: number }

/**
 * Encabezado de marca + fila de títulos congelada.
 *
 * La fila 1 lleva el nombre de la hoja y la 2 su subtítulo explicativo: una hoja
 * suelta que alguien reenvía por mail tiene que poder leerse sin el resto del
 * archivo, y ahí es donde se estampa qué filtros produjeron estos números.
 */
export function prepararHoja(
  ws: ExcelJS.Worksheet,
  titulo: string,
  subtitulo: string,
  cols: Col[],
): void {
  ws.columns = cols.map(c => ({ key: c.key, width: c.width }))

  const ultima = ws.getColumn(cols.length).letter

  ws.mergeCells(`A1:${ultima}1`)
  const t = ws.getCell('A1')
  t.value = titulo
  t.font = { name: 'Calibri', size: 14, bold: true, color: { argb: C.blanco } }
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.primary } }
  t.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.getRow(1).height = 26

  ws.mergeCells(`A2:${ultima}2`)
  const s = ws.getCell('A2')
  s.value = subtitulo
  s.font = { name: 'Calibri', size: 10, italic: true, color: { argb: C.muted } }
  s.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true }
  ws.getRow(2).height = 30

  const head = ws.getRow(3)
  head.values = cols.map(c => c.header)
  head.height = 20
  head.eachCell(cell => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.ink } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.primaryTint } }
    cell.alignment = { vertical: 'middle', wrapText: true }
    cell.border = { bottom: { style: 'thin', color: { argb: C.gold } } }
  })

  // Los títulos quedan fijos: estas hojas se leen scrolleando.
  ws.views = [{ state: 'frozen', ySplit: 3 }]
  ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: cols.length } }
}

/** Zebrado suave + bordes. Se aplica sobre las filas de datos ya escritas. */
export function estilarFilas(ws: ExcelJS.Worksheet, desde = 4): void {
  for (let i = desde; i <= ws.rowCount; i++) {
    const row = ws.getRow(i)
    const par = (i - desde) % 2 === 1
    row.eachCell(cell => {
      cell.font = { name: 'Calibri', size: 10, color: { argb: C.ink } }
      if (par) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.ghost } }
      cell.border = { bottom: { style: 'hair', color: { argb: C.borde } } }
      cell.alignment = { vertical: 'top', ...(cell.alignment ?? {}) }
    })
  }
}

/**
 * Pinta una celda con un tono semántico de la app. `neutral` la deja sin fondo,
 * para que un "inactivo" no grite más que el dato que importa.
 */
export function pintarEstado(cell: ExcelJS.Cell, tono: 'ok' | 'aviso' | 'error' | 'neutral'): void {
  if (tono === 'neutral') {
    cell.font = { name: 'Calibri', size: 10, color: { argb: C.muted } }
    return
  }
  const [texto, fondo] =
    tono === 'ok'
      ? [C.success, C.successBg]
      : tono === 'aviso'
        ? [C.warning, C.warningBg]
        : [C.error, C.errorBg]
  cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: texto } }
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fondo } }
}

/** ISO → Date, para que Excel la trate como fecha y no como texto. */
export function fecha(iso: string | null | undefined): Date | string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d
}

/** Libro nuevo con la autoría de la app ya puesta. */
export function nuevoLibro(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'MiLiors'
  wb.created = new Date()
  return wb
}

export async function aBuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  return Buffer.from(await wb.xlsx.writeBuffer())
}
