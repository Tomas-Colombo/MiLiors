/**
 * URL pública de la app, normalizada sin barra final.
 *
 * `NEXT_PUBLIC_APP_URL` la carga una persona en un panel, y pegar el dominio
 * con la barra al final es lo más natural del mundo. El problema es que el
 * código arma destinos concatenando (`${APP_URL}/lo-que-sea`), así que esa
 * barra de más produce `https://dominio//lo-que-sea`.
 *
 * En un href no molesta. Pero Supabase compara el `redirectTo` contra su lista
 * de Redirect URLs con coincidencia exacta: la doble barra no matchea, Supabase
 * descarta el destino y cae a la Site URL sin devolver ningún error. El flujo
 * de recuperación se rompe entero y no queda rastro de por qué.
 *
 * Normalizar acá cuesta una línea y elimina esa clase de falla silenciosa.
 */
export function appUrl(path = ''): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/+$/, '')
  if (!path) return base
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}
