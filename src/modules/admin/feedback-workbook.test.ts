import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { construirFeedbackWorkbook } from './feedback-workbook'
import { diagnosticoSesgo, agregarPorCompetenciaYNivel } from './queries'
import type { FeedbackCompetenciaRow, FeedbackGlobalRow, FeedbackSeccionRow } from './queries'

/**
 * El .xlsx es el entregable que el cliente abre para decidir qué recalibrar: si
 * una hoja sale vacía o un porcentaje sale mal, la decisión sale mal. Se genera
 * el archivo de verdad y se lo vuelve a leer con ExcelJS, que es lo más cerca
 * de "lo abrí en Excel" que se puede automatizar.
 */

function valoracion(over: Partial<FeedbackCompetenciaRow> = {}): FeedbackCompetenciaRow {
  return {
    id: crypto.randomUUID(),
    postulanteId: 'p-1',
    eneatipo: 3,
    competenciaKey: 'liderazgo',
    competenciaNombre: 'Liderazgo',
    nivelMostrado: 'Alto',
    valoracion: 'JUSTO',
    respondidoAt: '2026-08-20T10:00:00.000Z',
    informeGeneradoAt: '2026-08-19T10:00:00.000Z',
    ...over,
  }
}

function global(over: Partial<FeedbackGlobalRow> = {}): FeedbackGlobalRow {
  return {
    id: crypto.randomUUID(),
    postulanteId: 'p-1',
    eneatipo: 3,
    representatividad: 80,
    comentario: 'Me sentí bastante identificado.',
    respondidoAt: '2026-08-20T10:00:00.000Z',
    ...over,
  }
}

async function abrir(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook()
  // `as never`: la firma de load() pide un ArrayBuffer del DOM y acá corre en Node.
  await wb.xlsx.load(buffer as never)
  return wb
}

function seccion(puntaje: number, seccionKey = 'sintesis'): FeedbackSeccionRow {
  return {
    id: crypto.randomUUID(),
    postulanteId: 'p-1',
    eneatipo: 3,
    seccionKey,
    seccionLabel: 'Síntesis del perfil',
    puntaje,
    respondidoAt: '2026-09-24T10:00:00.000Z',
  }
}

describe('construirFeedbackWorkbook', () => {
  it('la hoja por sección aplica el criterio de 8 de cada 10 en 4 o 5', async () => {
    const aprobada = [5, 5, 4, 4, 4, 4, 4, 4, 3, 2].map(n => seccion(n))
    const aRevisar = [5, 4, 4, 4, 4, 4, 4, 3, 3, 2].map(n => seccion(n, 'fortalezas'))
    const wb = await abrir(
      await construirFeedbackWorkbook({
        secciones: [...aprobada, ...aRevisar],
        valoraciones: [],
        globales: [],
        filtrosDescripcion: '',
      }),
    )
    const ws = wb.getWorksheet('Por sección')!
    expect(ws.getRow(4).getCell(4).value).toBe(0.8)
    expect(ws.getRow(4).getCell(5).value).toBe('Aprobada')
    expect(ws.getRow(5).getCell(4).value).toBe(0.7)
    expect(ws.getRow(5).getCell(5).value).toBe('A revisar')
  })

  it('genera las cinco hojas en orden', async () => {
    const wb = await abrir(
      await construirFeedbackWorkbook({
        secciones: [],
        valoraciones: [valoracion()],
        globales: [global()],
        filtrosDescripcion: 'Incluye todo el histórico, sin filtros.',
      }),
    )
    expect(wb.worksheets.map(w => w.name)).toEqual([
      'Por sección',
      'Histórico · Resumen',
      'Histórico · Por nivel',
      'Comentarios',
      'Histórico · Detalle',
    ])
  })

  it('estampa los filtros aplicados en el subtítulo', async () => {
    const wb = await abrir(
      await construirFeedbackWorkbook({
        secciones: [],
        valoraciones: [valoracion()],
        globales: [],
        filtrosDescripcion: 'Filtrado por: nivel mostrado Alto.',
      }),
    )
    // Un archivo descargado se reenvía: tiene que decir de qué recorte salió.
    expect(String(wb.getWorksheet('Histórico · Resumen')!.getCell('A2').value)).toContain(
      'Filtrado por: nivel mostrado Alto.',
    )
  })

  it('calcula porcentajes y sesgo sobre el total de cada competencia', async () => {
    // El motor la subestima 3 veces y la sobrestima 1 → sesgo = (75 − 25) = +50.
    const valoraciones = [
      valoracion({ valoracion: 'SUBESTIMA' }),
      valoracion({ valoracion: 'SUBESTIMA' }),
      valoracion({ valoracion: 'SUBESTIMA' }),
      valoracion({ valoracion: 'SOBRESTIMA' }),
    ]
    const wb = await abrir(
      await construirFeedbackWorkbook({ secciones: [], valoraciones, globales: [], filtrosDescripcion: '' }),
    )
    const fila = wb.getWorksheet('Histórico · Resumen')!.getRow(4)

    expect(fila.getCell(1).value).toBe('Liderazgo')
    expect(fila.getCell(2).value).toBe(4)
    // Se guardan como fracción con formato de porcentaje: así Excel los promedia bien.
    expect(fila.getCell(3).value).toBeCloseTo(0.75)
    expect(fila.getCell(5).value).toBeCloseTo(0.25)
    expect(fila.getCell(6).value).toBeCloseTo(0.5)
    expect(fila.getCell(7).value).toBe('Subir el peso (muy corta)')
  })

  it('traduce el enum al vocabulario del reporte', async () => {
    const wb = await abrir(
      await construirFeedbackWorkbook({
        secciones: [],
        valoraciones: [valoracion({ valoracion: 'SOBRESTIMA' })],
        globales: [],
        filtrosDescripcion: '',
      }),
    )
    // 'SOBRESTIMA' es jerga de la base; el reporte lo dice desde el motor.
    expect(wb.getWorksheet('Histórico · Detalle')!.getRow(4).getCell(3).value).toBe('Sobrestimado')
  })

  it('ordena los comentarios de peor a mejor puntuado y descarta los vacíos', async () => {
    const globales = [
      global({ representatividad: 90, comentario: 'Excelente' }),
      global({ representatividad: 20, comentario: 'No me representa' }),
      global({ representatividad: 50, comentario: '   ' }),
      global({ representatividad: 60, comentario: null }),
    ]
    const wb = await abrir(
      await construirFeedbackWorkbook({ secciones: [], valoraciones: [], globales, filtrosDescripcion: '' }),
    )
    const ws = wb.getWorksheet('Comentarios')!

    // Fila 3 son los títulos: las de datos arrancan en la 4.
    expect(ws.getRow(4).getCell(2).value).toBe('No me representa')
    expect(ws.getRow(5).getCell(2).value).toBe('Excelente')
    expect(ws.rowCount).toBe(5)
  })

  it('baja el id seudónimo pero nada que identifique a la persona', async () => {
    const wb = await abrir(
      await construirFeedbackWorkbook({
        secciones: [],
        valoraciones: [valoracion({ postulanteId: 'p-abc' })],
        globales: [global({ postulanteId: 'p-abc' })],
        filtrosDescripcion: '',
      }),
    )
    // El seudónimo es lo único que permite agrupar las respuestas de una misma
    // persona. Va en Comentarios y Detalle, y en ningún agregado.
    expect(wb.getWorksheet('Comentarios')!.getRow(4).getCell(5).value).toBe('p-abc')
    expect(wb.getWorksheet('Histórico · Detalle')!.getRow(4).getCell(7).value).toBe('p-abc')
    for (const hoja of ['Histórico · Resumen', 'Histórico · Por nivel']) {
      wb.getWorksheet(hoja)!.eachRow(row => {
        row.eachCell(cell => expect(String(cell.value ?? '')).not.toContain('p-abc'))
      })
    }
  })

  it('avisa en el archivo cuando los datos vienen recortados', async () => {
    const wb = await abrir(
      await construirFeedbackWorkbook({
        secciones: [],
        valoraciones: [valoracion()],
        globales: [],
        filtrosDescripcion: 'Incluye todo el histórico, sin filtros.',
        truncado: true,
      }),
    )
    // Un porcentaje calculado sobre una muestra recortada es peor que no
    // tenerlo: el aviso viaja dentro del archivo, no sólo en la pantalla.
    for (const hoja of ['Histórico · Resumen', 'Histórico · Por nivel']) {
      expect(String(wb.getWorksheet(hoja)!.getCell('A2').value)).toContain('PARCIAL')
    }
  })

  it('no ensucia el subtítulo cuando los datos están completos', async () => {
    const wb = await abrir(
      await construirFeedbackWorkbook({
        secciones: [],
        valoraciones: [valoracion()],
        globales: [],
        filtrosDescripcion: 'Incluye todo el histórico, sin filtros.',
      }),
    )
    expect(String(wb.getWorksheet('Histórico · Resumen')!.getCell('A2').value)).not.toContain('PARCIAL')
  })

  it('no se rompe sin datos', async () => {
    const wb = await abrir(
      await construirFeedbackWorkbook({ secciones: [], valoraciones: [], globales: [], filtrosDescripcion: '' }),
    )
    // Sólo encabezado + subtítulo + títulos de columna.
    expect(wb.getWorksheet('Histórico · Resumen')!.rowCount).toBe(3)
  })
})

describe('diagnosticoSesgo', () => {
  it('distingue una competencia calibrada de una partida al medio', () => {
    // Sesgo 0 con casi todos conformes: calibrada.
    expect(diagnosticoSesgo({ sesgo: 0, justo: 8, total: 10 })).toBe('Calibrada')
    // Mismo sesgo 0, pero mitad dice "bajo" y mitad "alto": no está calibrada.
    expect(diagnosticoSesgo({ sesgo: 0, justo: 0, total: 10 })).toBe(
      'Polarizada: revisar el criterio',
    )
  })

  it('dice para qué lado mover el peso', () => {
    expect(diagnosticoSesgo({ sesgo: 40, justo: 2, total: 10 })).toBe('Subir el peso (muy corta)')
    expect(diagnosticoSesgo({ sesgo: 20, justo: 5, total: 10 })).toBe('Subir el peso')
    expect(diagnosticoSesgo({ sesgo: -20, justo: 5, total: 10 })).toBe('Bajar el peso')
    expect(diagnosticoSesgo({ sesgo: -40, justo: 2, total: 10 })).toBe('Bajar el peso (muy alta)')
  })
})

describe('agregarPorCompetenciaYNivel', () => {
  it('separa la misma competencia por el nivel que se mostró', () => {
    const rows = [
      valoracion({ nivelMostrado: 'Alto', valoracion: 'SOBRESTIMA' }),
      valoracion({ nivelMostrado: 'Alto', valoracion: 'SOBRESTIMA' }),
      valoracion({ nivelMostrado: 'Medio', valoracion: 'JUSTO' }),
    ]
    const agregados = agregarPorCompetenciaYNivel(rows)

    // El corte que distingue "bajar el peso" de "tocar el factor de contraste":
    // se queja en Alto y está conforme en Medio.
    expect(agregados).toHaveLength(2)
    expect(agregados[0]).toMatchObject({ nivel: 'Alto', total: 2, sesgo: -100 })
    expect(agregados[1]).toMatchObject({ nivel: 'Medio', total: 1, sesgo: 0 })
  })
})
