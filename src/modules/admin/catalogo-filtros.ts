/**
 * Filtrado y orden de los catálogos de admin (carreras, idiomas, habilidades,
 * sectores, empresas).
 *
 * Vive acá, puro y sin 'server-only', porque lo usan DOS lados: el server
 * component que pinta la tabla y la ruta que arma el .xlsx. Si cada uno
 * filtrara por su cuenta, tarde o temprano la pantalla mostraría 3 filas y el
 * archivo bajaría 300 — que es exactamente lo que pasaba con el buscador de
 * comentarios del feedback antes de unificarlo.
 */

export type FiltrosCatalogo = {
  q?: string
  /** 'activo'/'activa' o 'inactivo'/'inactiva'/'baja'. Vacío = todos. */
  estado?: string
  /** 'YYYY-MM-DD' sobre la fecha de alta. */
  desde?: string
  hasta?: string
  orden?: string
}

/** Cómo leer nombre, estado y fecha de alta de una fila cualquiera del catálogo. */
export type AccesoresCatalogo<T> = {
  nombre: (row: T) => string
  activo: (row: T) => boolean
  createdAt: (row: T) => string
  /** Texto extra que también matchea la búsqueda (ej: reclutadores de una empresa). */
  buscarTambienEn?: (row: T) => string[]
}

/** `true` si el filtro de estado pide sólo los activos. */
function pideActivos(estado: string): boolean {
  return estado === 'activo' || estado === 'activa'
}

/** `true` si el filtro de estado pide sólo los dados de baja. */
function pideInactivos(estado: string): boolean {
  return estado === 'inactivo' || estado === 'inactiva' || estado === 'baja'
}

/**
 * Corte superior del rango de fechas.
 *
 * `hasta` llega como 'YYYY-MM-DD' y se compara contra un timestamp ISO. Sin
 * extenderlo al final del día, elegir "hasta el 12" deja afuera todo lo cargado
 * ese mismo 12 — un bug silencioso que sólo se nota contando a mano.
 */
export function finDelDia(hasta: string | undefined): string {
  return hasta ? `${hasta}T23:59:59.999Z` : ''
}

export function filtrarCatalogo<T>(
  rows: T[],
  filtros: FiltrosCatalogo,
  acc: AccesoresCatalogo<T>,
): T[] {
  const q = filtros.q?.trim().toLowerCase() ?? ''
  const estado = filtros.estado ?? ''
  const desde = filtros.desde ?? ''
  const hasta = finDelDia(filtros.hasta)

  return rows.filter(row => {
    const esActivo = acc.activo(row)
    if (pideActivos(estado) && !esActivo) return false
    if (pideInactivos(estado) && esActivo) return false

    const alta = acc.createdAt(row)
    if (desde && alta < desde) return false
    if (hasta && alta > hasta) return false

    if (q) {
      const campos = [acc.nombre(row), ...(acc.buscarTambienEn?.(row) ?? [])]
      if (!campos.some(c => c.toLowerCase().includes(q))) return false
    }
    return true
  })
}

/**
 * Orden de los catálogos. El vacío respeta el que ya trae la consulta, así que
 * devuelve el mismo array sin copiarlo.
 */
export function ordenarCatalogo<T>(
  rows: T[],
  orden: string | undefined,
  acc: Pick<AccesoresCatalogo<T>, 'nombre' | 'createdAt'>,
): T[] {
  if (!orden) return rows
  return [...rows].sort((a, b) => {
    if (orden === 'alta_desc' || orden === 'recientes') {
      return acc.createdAt(b).localeCompare(acc.createdAt(a))
    }
    if (orden === 'alta_asc' || orden === 'antiguas') {
      return acc.createdAt(a).localeCompare(acc.createdAt(b))
    }
    const cmp = acc.nombre(a).localeCompare(acc.nombre(b), 'es')
    return orden === 'nombre_desc' ? -cmp : cmp
  })
}

/**
 * Los filtros vigentes en castellano, para estampar en el subtítulo de cada
 * hoja. Un archivo descargado se reenvía y se archiva: sin esto, dentro de dos
 * meses nadie sabe si esas filas son todo el catálogo o un recorte.
 */
export function describirFiltrosCatalogo(
  filtros: FiltrosCatalogo,
  extra: string[] = [],
): string {
  const partes: string[] = [...extra]

  if (filtros.q?.trim()) partes.push(`que dicen “${filtros.q.trim()}”`)
  if (pideActivos(filtros.estado ?? '')) partes.push('sólo activos')
  if (pideInactivos(filtros.estado ?? '')) partes.push('sólo dados de baja')

  if (filtros.desde && filtros.hasta) partes.push(`alta del ${filtros.desde} al ${filtros.hasta}`)
  else if (filtros.desde) partes.push(`alta desde el ${filtros.desde}`)
  else if (filtros.hasta) partes.push(`alta hasta el ${filtros.hasta}`)

  return partes.length === 0
    ? 'Incluye todo el catálogo, sin filtros.'
    : `Filtrado por: ${partes.join(' · ')}.`
}

/**
 * Query string para `/api/admin/catalogos/export`, con los filtros vigentes
 * adentro. Las claves vacías se descartan para que la URL no se llene de ruido.
 */
export function qsExportCatalogo(
  recurso: string,
  params: Record<string, string | undefined>,
): string {
  const qs = new URLSearchParams({ recurso })
  for (const [key, value] of Object.entries(params)) {
    if (value?.trim()) qs.set(key, value.trim())
  }
  return qs.toString()
}
