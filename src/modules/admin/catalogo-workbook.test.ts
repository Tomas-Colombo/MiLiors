import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import {
  construirCarrerasWorkbook,
  construirCatalogoSimpleWorkbook,
  construirCompetenciasWorkbook,
  construirEmpresasWorkbook,
} from './catalogo-workbook'
import type { CarreraAdmin, CompetenciaUsoAdmin, EmpresaAdmin } from './queries'

/** Se genera el .xlsx de verdad y se lo relee: es lo más cerca de abrirlo en Excel. */
async function abrir(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook()
  // `as never`: la firma de load() pide un ArrayBuffer del DOM y acá corre en Node.
  await wb.xlsx.load(buffer as never)
  return wb
}

const carrera = (over: Partial<CarreraAdmin> = {}): CarreraAdmin => ({
  id: crypto.randomUUID(),
  nombre: 'Ingeniería en Sistemas',
  fecha_baja: null,
  created_at: '2026-01-10T10:00:00.000Z',
  ...over,
})

describe('construirCarrerasWorkbook', () => {
  it('separa oficiales de las cargadas por postulantes', async () => {
    const wb = await abrir(
      await construirCarrerasWorkbook({
        oficiales: [carrera()],
        otras: [{ nombre: 'Tecnicatura en Robótica', cantidad: 3, primeraFecha: '2026-02-01T10:00:00.000Z' }],
        filtrosOficiales: 'Incluye todo el catálogo, sin filtros.',
        filtrosOtras: 'Incluye todo el catálogo, sin filtros.',
      }),
    )
    expect(wb.worksheets.map(w => w.name)).toEqual(['Oficiales', 'Cargadas por postulantes'])
    expect(wb.getWorksheet('Oficiales')!.getRow(4).getCell(1).value).toBe('Ingeniería en Sistemas')
    expect(wb.getWorksheet('Cargadas por postulantes')!.getRow(4).getCell(2).value).toBe(3)
  })

  it('ordena las cargadas por postulantes de mayor a menor recuento', async () => {
    const wb = await abrir(
      await construirCarrerasWorkbook({
        oficiales: [],
        otras: [
          { nombre: 'Poco repetida', cantidad: 1, primeraFecha: '2026-01-01T00:00:00.000Z' },
          { nombre: 'Muy repetida', cantidad: 9, primeraFecha: '2026-01-01T00:00:00.000Z' },
        ],
        filtrosOficiales: '',
        filtrosOtras: '',
      }),
    )
    // Lo que más se repite es lo primero a promover a carrera oficial.
    const ws = wb.getWorksheet('Cargadas por postulantes')!
    expect(ws.getRow(4).getCell(1).value).toBe('Muy repetida')
    expect(ws.getRow(5).getCell(1).value).toBe('Poco repetida')
  })

  it('traduce la baja lógica a un estado legible', async () => {
    const wb = await abrir(
      await construirCarrerasWorkbook({
        oficiales: [carrera({ fecha_baja: '2026-05-01T00:00:00.000Z' })],
        otras: [],
        filtrosOficiales: '',
        filtrosOtras: '',
      }),
    )
    expect(wb.getWorksheet('Oficiales')!.getRow(4).getCell(2).value).toBe('Inactiva')
  })
})

describe('construirCompetenciasWorkbook', () => {
  const uso = (over: Partial<CompetenciaUsoAdmin> = {}): CompetenciaUsoAdmin => ({
    id: crypto.randomUUID(),
    nombre: 'TypeScript',
    postulantes: 5,
    basico: 1,
    intermedio: 2,
    avanzado: 2,
    createdAt: '2026-01-10T10:00:00.000Z',
    activa: true,
    ...over,
  })

  it('arma la hoja de catálogo y la de uso', async () => {
    const wb = await abrir(
      await construirCompetenciasWorkbook({
        catalogo: [{ nombre: 'TypeScript', activo: true, createdAt: '2026-01-10T10:00:00.000Z' }],
        uso: [uso()],
        filtrosDescripcion: '',
      }),
    )
    expect(wb.worksheets.map(w => w.name)).toEqual(['Catálogo', 'Uso por postulantes'])

    const ws = wb.getWorksheet('Uso por postulantes')!
    expect(ws.getRow(4).getCell(1).value).toBe('TypeScript')
    expect(ws.getRow(4).getCell(2).value).toBe(5)
    // Básico, intermedio y avanzado tienen que sumar el total de postulantes.
    const [b, i, a] = [3, 4, 5].map(c => ws.getRow(4).getCell(c).value as number)
    expect(b + i + a).toBe(5)
  })

  it('el catálogo incluye lo que nadie cargó todavía', async () => {
    const wb = await abrir(
      await construirCompetenciasWorkbook({
        catalogo: [{ nombre: 'COBOL', activo: true, createdAt: '2026-01-10T10:00:00.000Z' }],
        uso: [],
        filtrosDescripcion: '',
      }),
    )
    expect(wb.getWorksheet('Catálogo')!.getRow(4).getCell(1).value).toBe('COBOL')
    // Sólo encabezado + subtítulo + títulos: nadie la cargó.
    expect(wb.getWorksheet('Uso por postulantes')!.rowCount).toBe(3)
  })
})

describe('construirEmpresasWorkbook', () => {
  const empresa = (over: Partial<EmpresaAdmin> = {}): EmpresaAdmin => ({
    id: crypto.randomUUID(),
    nombre_empresa: 'Acme',
    descripcion: 'Consultora',
    activa: true,
    created_at: '2026-01-10T10:00:00.000Z',
    reclutadores: [{ id: 'r1', nombre: 'Ana', email: 'ana@acme.com' }],
    ...over,
  })

  it('lista los reclutadores uno por línea dentro de la celda', async () => {
    const wb = await abrir(
      await construirEmpresasWorkbook({
        empresas: [
          empresa({
            reclutadores: [
              { id: 'r1', nombre: 'Ana', email: 'ana@acme.com' },
              { id: 'r2', nombre: 'Beto', email: null },
            ],
          }),
        ],
        filtrosDescripcion: '',
      }),
    )
    const row = wb.getWorksheet('Empresas')!.getRow(4)
    expect(row.getCell(3).value).toBe(2)
    expect(String(row.getCell(4).value)).toBe('Ana\nBeto')
    // Sin email se marca, no se deja la celda corrida respecto de los nombres.
    expect(String(row.getCell(5).value)).toBe('ana@acme.com\n—')
  })

  it('cuenta cero cuando la empresa no tiene reclutadores', async () => {
    const wb = await abrir(
      await construirEmpresasWorkbook({
        empresas: [empresa({ reclutadores: [] })],
        filtrosDescripcion: '',
      }),
    )
    expect(wb.getWorksheet('Empresas')!.getRow(4).getCell(3).value).toBe(0)
  })
})

describe('construirCatalogoSimpleWorkbook', () => {
  it('estampa los filtros aplicados en el subtítulo', async () => {
    const wb = await abrir(
      await construirCatalogoSimpleWorkbook({
        hoja: 'Idiomas',
        titulo: 'Idiomas',
        descripcion: 'Catálogo de idiomas.',
        etiquetaAlta: 'Creado',
        etiquetaActivo: 'Activo',
        etiquetaInactivo: 'Inactivo',
        filas: [{ nombre: 'Inglés', activo: true, createdAt: '2026-01-10T10:00:00.000Z' }],
        filtrosDescripcion: 'Filtrado por: sólo activos.',
      }),
    )
    const ws = wb.getWorksheet('Idiomas')!
    expect(String(ws.getCell('A2').value)).toContain('Filtrado por: sólo activos.')
    expect(ws.getRow(4).getCell(1).value).toBe('Inglés')
    expect(ws.getRow(4).getCell(2).value).toBe('Activo')
  })

  it('no se rompe con el catálogo vacío', async () => {
    const wb = await abrir(
      await construirCatalogoSimpleWorkbook({
        hoja: 'Sectores',
        titulo: 'Sectores industriales',
        descripcion: '',
        etiquetaAlta: 'Creado',
        etiquetaActivo: 'Activo',
        etiquetaInactivo: 'Inactivo',
        filas: [],
        filtrosDescripcion: '',
      }),
    )
    expect(wb.getWorksheet('Sectores')!.rowCount).toBe(3)
  })
})
