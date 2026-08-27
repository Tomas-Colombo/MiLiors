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

/**
 * Dominio público oficial de la app.
 *
 * Es el fallback de todo lo que sale IMPRESO o CONGELADO: el QR queda grabado
 * dentro de un PDF firmado que vive para siempre en Storage, así que si
 * `NEXT_PUBLIC_APP_URL` no está cargada en el panel, el código no puede
 * resolver a una ruta relativa ni a un dominio ajeno — el certificado ya se
 * emitió y nadie se entera hasta que alguien lo escanea.
 */
export const APP_URL_OFICIAL = 'https://mi-liors.vercel.app'

/** Base pública garantizada ABSOLUTA — para QR, PDFs y cualquier link que salga de la app. */
export function appUrlPublico(path = ''): string {
  const base = appUrl() || APP_URL_OFICIAL
  if (!path) return base
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

/** Host legible para imprimir en el certificado: 'mi-liors.vercel.app/verificar'. */
export function verificarLabel(): string {
  return `${appUrlPublico().replace(/^https?:\/\//, '')}/verificar`
}
