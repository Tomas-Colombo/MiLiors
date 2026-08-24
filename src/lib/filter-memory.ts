/**
 * Memoria de filtros por pestaña.
 *
 * Los filtros de listado viven en la query string (ver components/shared/list-controls.tsx),
 * así que recordar los filtros de una vista es recordar su query. Se guarda una entrada por
 * pathname en sessionStorage: la memoria dura lo que dura la pestaña, y una pestaña nueva
 * siempre abre el listado sin filtrar.
 *
 * Escribe <FilterMemory>, montado en el layout de cada rol. Leen los enlaces que vuelven a
 * un listado: <AppSidebar> y <VolverLink>.
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

export function borrarFiltros(pathname: string) {
  try {
    sessionStorage.removeItem(clave(pathname))
  } catch {
    // no-op
  }
}

/** Devuelve el mismo pathname si no hay filtros recordados. */
export function hrefConFiltros(pathname: string): string {
  const qs = leerFiltros(pathname)
  return qs ? `${pathname}?${qs}` : pathname
}
