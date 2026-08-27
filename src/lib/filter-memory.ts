/**
 * Memoria de filtros por pestaña.
 *
 * Los filtros de listado viven en la query string (ver components/shared/list-controls.tsx),
 * así que recordar los filtros de una vista es recordar su query. Se guarda una entrada por
 * pathname en sessionStorage: la memoria dura lo que dura la pestaña, y una pestaña nueva
 * siempre abre el listado sin filtrar.
 *
 * Escribe <FilterMemory>, montado en el layout de cada rol. Lee un solo consumidor:
 * <VolverLink>, el enlace que vuelve a un listado desde el detalle.
 *
 * A propósito NO la lee la navegación del menú: entrar a una sección desde el sidebar
 * significa "lleváme al listado", no "restaurá lo que había filtrado". Restaurar ahí
 * devolvía una lista ya filtrada sin que nadie lo pidiera.
 */

const PREFIJO = 'miliors-filters:'

function clave(pathname: string) {
  return PREFIJO + pathname
}

/** Una query vacía borra la entrada, para que "Limpiar filtros" no deje memoria atrás. */
export function guardarFiltros(pathname: string, queryString: string) {
  try {
    if (queryString) sessionStorage.setItem(clave(pathname), queryString)
    else sessionStorage.removeItem(clave(pathname))
  } catch {
    // no-op
  }
}

export function leerFiltros(pathname: string): string {
  try {
    return sessionStorage.getItem(clave(pathname)) ?? ''
  } catch {
    return ''
  }
}

/** Devuelve el mismo pathname si no hay filtros recordados. */
export function hrefConFiltros(pathname: string): string {
  const qs = leerFiltros(pathname)
  return qs ? `${pathname}?${qs}` : pathname
}
