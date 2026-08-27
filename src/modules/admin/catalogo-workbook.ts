import 'server-only'
import type ExcelJS from 'exceljs'
import {
  C,
  aBuffer,
  estilarFilas,
  fecha,
  nuevoLibro,
  pintarEstado,
  prepararHoja,
  type Col,
} from './xlsx-estilo'
import type {
  CarreraAdmin,
  CarreraOtraAdmin,
  CompetenciaUsoAdmin,
  EmpresaAdmin,
} from './queries'

/**
 * Exports de los catálogos de admin, con el mismo formato que el reporte de
 * feedback: una hoja por grano, encabezado de marca, títulos congelados y el
 * detalle de los filtros aplicados en el subtítulo.
 *
 * Lo que entra acá ya viene FILTRADO por la ruta, con las mismas funciones puras
 * que usa la pantalla (ver catalogo-filtros.ts). Este módulo sólo dibuja.
 */

/** Fila mínima de un catálogo con baja lógica: es la forma que comparten casi todos. */
export type FilaCatalogo = {
  nombre: string
  activo: boolean
  createdAt: string
}

const COLS_CATALOGO = (etiquetaAlta: string): Col[] => [
  { header: 'Nombre', key: 'nombre', width: 42 },
  { header: 'Estado', key: 'estado', width: 14 },
  { header: etiquetaAlta, key: 'alta', width: 14 },
]

/** Hoja estándar de catálogo: nombre, estado y fecha de alta. */
function hojaCatalogo(
  wb: ExcelJS.Workbook,
  opts: {
    hoja: string
    titulo: string
    subtitulo: string
    etiquetaAlta: string
    etiquetaActivo: string
    etiquetaInactivo: string
    filas: FilaCatalogo[]
  },
): void {
  const ws = wb.addWorksheet(opts.hoja, { properties: { tabColor: { argb: C.primary } } })
  prepararHoja(ws, opts.titulo, opts.subtitulo, COLS_CATALOGO(opts.etiquetaAlta))

  for (const f of opts.filas) {
    const row = ws.addRow({
      nombre: f.nombre,
      estado: f.activo ? opts.etiquetaActivo : opts.etiquetaInactivo,
      alta: fecha(f.createdAt),
    })
    row.getCell('alta').numFmt = 'dd/mm/yyyy'
    pintarEstado(row.getCell('estado'), f.activo ? 'ok' : 'neutral')
  }
  estilarFilas(ws)
}

export type CatalogoSimpleInput = {
  filas: FilaCatalogo[]
  filtrosDescripcion: string
}

export async function construirCarrerasWorkbook(input: {
  oficiales: CarreraAdmin[]
  otras: CarreraOtraAdmin[]
  filtrosOficiales: string
  filtrosOtras: string
}): Promise<Buffer> {
  const wb = nuevoLibro()

  hojaCatalogo(wb, {
    hoja: 'Oficiales',
    titulo: 'Carreras oficiales',
    subtitulo: `Catálogo curado por administración: es lo que el postulante puede elegir de una lista. ${input.filtrosOficiales}`,
    etiquetaAlta: 'Creada',
    etiquetaActivo: 'Activa',
    etiquetaInactivo: 'Inactiva',
    filas: input.oficiales.map(c => ({
      nombre: c.nombre,
      activo: !c.fecha_baja,
      createdAt: c.created_at,
    })),
  })

  const ws = wb.addWorksheet('Cargadas por postulantes', {
    properties: { tabColor: { argb: C.gold } },
  })
  prepararHoja(
    ws,
    'Carreras cargadas por postulantes',
    `Texto libre que escribieron cuando su carrera no estaba en el catálogo. Las de mayor recuento son las candidatas a promover a carrera oficial. ${input.filtrosOtras}`,
    [
      { header: 'Título escrito', key: 'nombre', width: 46 },
      { header: 'Postulantes', key: 'cantidad', width: 13 },
      { header: 'Primera vez cargada', key: 'primera', width: 18 },
    ],
  )

  // De mayor a menor recuento: lo que más se repite es lo primero a promover.
  const otrasOrdenadas = [...input.otras].sort(
    (a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, 'es'),
  )
  for (const o of otrasOrdenadas) {
    const row = ws.addRow({
      nombre: o.nombre,
      cantidad: o.cantidad,
      primera: fecha(o.primeraFecha),
    })
    row.getCell('primera').numFmt = 'dd/mm/yyyy'
    // Repetida por varias personas = ya no es un caso suelto, es una carrera que falta.
    if (o.cantidad > 1) pintarEstado(row.getCell('cantidad'), 'aviso')
  }
  estilarFilas(ws)

  return aBuffer(wb)
}

export async function construirCompetenciasWorkbook(input: {
  catalogo: FilaCatalogo[]
  uso: CompetenciaUsoAdmin[]
  filtrosDescripcion: string
}): Promise<Buffer> {
  const wb = nuevoLibro()

  hojaCatalogo(wb, {
    hoja: 'Catálogo',
    titulo: 'Habilidades y tecnologías',
    subtitulo: `Catálogo completo, incluidas las que todavía nadie cargó. ${input.filtrosDescripcion}`,
    etiquetaAlta: 'Creada',
    etiquetaActivo: 'Activa',
    etiquetaInactivo: 'Inactiva',
    filas: input.catalogo,
  })

  const ws = wb.addWorksheet('Uso por postulantes', {
    properties: { tabColor: { argb: C.gold } },
  })
  prepararHoja(
    ws,
    'Uso por postulantes',
    'Qué habilidades cargan efectivamente los postulantes y con qué nivel. Sólo aparecen las que tienen al menos un uso. Una habilidad con mucho uso y alta reciente suele ser una que trajo un postulante escribiéndola a mano.',
    [
      { header: 'Habilidad / tecnología', key: 'nombre', width: 38 },
      { header: 'Postulantes', key: 'total', width: 13 },
      { header: 'Básico', key: 'basico', width: 11 },
      { header: 'Intermedio', key: 'intermedio', width: 12 },
      { header: 'Avanzado', key: 'avanzado', width: 11 },
      { header: 'Alta en catálogo', key: 'alta', width: 16 },
      { header: 'Estado', key: 'estado', width: 13 },
    ],
  )

  for (const u of input.uso) {
    const row = ws.addRow({
      nombre: u.nombre,
      total: u.postulantes,
      basico: u.basico,
      intermedio: u.intermedio,
      avanzado: u.avanzado,
      alta: fecha(u.createdAt),
      estado: u.activa ? 'Activa' : 'Inactiva',
    })
    row.getCell('alta').numFmt = 'dd/mm/yyyy'
    pintarEstado(row.getCell('estado'), u.activa ? 'ok' : 'neutral')
    // Dada de baja pero todavía en uso: alguien la sigue teniendo en su perfil.
    if (!u.activa && u.postulantes > 0) pintarEstado(row.getCell('total'), 'error')
  }
  estilarFilas(ws)

  return aBuffer(wb)
}

export async function construirEmpresasWorkbook(input: {
  empresas: EmpresaAdmin[]
  filtrosDescripcion: string
}): Promise<Buffer> {
  const wb = nuevoLibro()
  const ws = wb.addWorksheet('Empresas', { properties: { tabColor: { argb: C.primary } } })

  prepararHoja(
    ws,
    'Empresas',
    `Empresas registradas y sus reclutadores. ${input.filtrosDescripcion}`,
    [
      { header: 'Empresa', key: 'nombre', width: 34 },
      { header: 'Estado', key: 'estado', width: 12 },
      { header: 'Reclutadores', key: 'cantidad', width: 13 },
      { header: 'Nombres', key: 'nombres', width: 34 },
      { header: 'Emails', key: 'emails', width: 38 },
      { header: 'Creada', key: 'alta', width: 14 },
      { header: 'Descripción', key: 'descripcion', width: 50 },
    ],
  )

  for (const e of input.empresas) {
    const row = ws.addRow({
      nombre: e.nombre_empresa,
      estado: e.activa ? 'Activa' : 'Baja',
      cantidad: e.reclutadores.length,
      // Un reclutador por línea dentro de la celda: pegar un CSV adentro de una
      // columna obliga a re-partirlo para leerlo.
      nombres: e.reclutadores.map(r => r.nombre).join('\n'),
      emails: e.reclutadores.map(r => r.email ?? '—').join('\n'),
      alta: fecha(e.created_at),
      descripcion: e.descripcion ?? '',
    })
    row.getCell('alta').numFmt = 'dd/mm/yyyy'
    row.getCell('nombres').alignment = { vertical: 'top', wrapText: true }
    row.getCell('emails').alignment = { vertical: 'top', wrapText: true }
    row.getCell('descripcion').alignment = { vertical: 'top', wrapText: true }
    pintarEstado(row.getCell('estado'), e.activa ? 'ok' : 'neutral')
    // Sin reclutadores no puede publicar: es la fila accionable de esta hoja.
    if (e.reclutadores.length === 0) pintarEstado(row.getCell('cantidad'), 'aviso')
    row.height = Math.max(15, 13 * Math.max(1, e.reclutadores.length))
  }
  estilarFilas(ws)

  return aBuffer(wb)
}

/** Catálogos de una sola hoja: idiomas y sectores. */
export async function construirCatalogoSimpleWorkbook(
  opts: CatalogoSimpleInput & {
    hoja: string
    titulo: string
    descripcion: string
    etiquetaAlta: string
    etiquetaActivo: string
    etiquetaInactivo: string
  },
): Promise<Buffer> {
  const wb = nuevoLibro()
  hojaCatalogo(wb, {
    hoja: opts.hoja,
    titulo: opts.titulo,
    subtitulo: `${opts.descripcion} ${opts.filtrosDescripcion}`,
    etiquetaAlta: opts.etiquetaAlta,
    etiquetaActivo: opts.etiquetaActivo,
    etiquetaInactivo: opts.etiquetaInactivo,
    filas: opts.filas,
  })
  return aBuffer(wb)
}
