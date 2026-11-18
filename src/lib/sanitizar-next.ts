import type { RolUsuario } from '@/lib/types/domain'

/**
 * Destinos a los que se puede volver después del login o el registro.
 * Lista cerrada de prefijos: cualquier otra ruta interna (/admin, /reclutador,
 * /api...) se ignora aunque sea relativa.
 */
const PREFIJO_EMPLEOS = '/empleos/'
const PREFIJO_POSTULANTE = '/postulante/'
const PREFIJOS_PERMITIDOS = [PREFIJO_EMPLEOS, PREFIJO_POSTULANTE]

const LARGO_MAXIMO = 512
// Caracteres de control (incluye tab y saltos de línea, que los navegadores
// descartan al parsear y convierten "/\t/evil.com" en "//evil.com") y backslash,
// que algunos navegadores tratan como "/".
// eslint-disable-next-line no-control-regex
const CONTROL_O_BACKSLASH = /[\u0000-\u001f\u007f\\]/
const BASE_FICTICIA = 'http://destino.invalid'

/**
 * Valida el parámetro `next` de login/registro y devuelve una ruta interna
 * normalizada (pathname + search, sin hash), o null si no es seguro.
 *
 * Sólo acepta rutas relativas que empiecen con `/empleos/` o `/postulante/`.
 * Rechaza esquemas, dobles barras, backslashes, caracteres de control,
 * segmentos `.`/`..` y variantes percent-encoded de todo eso.
 */
export function sanitizarNext(next: unknown): string | null {
  if (typeof next !== 'string') return null
  if (next.length === 0 || next.length > LARGO_MAXIMO) return null
  if (CONTROL_O_BACKSLASH.test(next)) return null
  if (!next.startsWith('/') || next.startsWith('//')) return null

  let url: URL
  try {
    url = new URL(next, BASE_FICTICIA)
  } catch {
    return null
  }
  // Si el parseo cambió el origen, `next` no era una ruta relativa.
  if (url.origin !== BASE_FICTICIA) return null

  let decodificado: string
  try {
    decodificado = decodeURIComponent(url.pathname)
  } catch {
    return null
  }
  if (CONTROL_O_BACKSLASH.test(decodificado)) return null
  if (decodificado.includes('//')) return null
  if (decodificado.split('/').some((segmento) => segmento === '.' || segmento === '..')) return null

  const prefijoOk = PREFIJOS_PERMITIDOS.some(
    (prefijo) => url.pathname.startsWith(prefijo) && url.pathname.length > prefijo.length,
  )
  if (!prefijoOk) return null

  return url.pathname + url.search
}

/**
 * Igual que `sanitizarNext`, pero además exige que el destino sirva para el rol:
 * `/empleos/...` es una vista previa pública y sirve a cualquiera; `/postulante/...`
 * sólo al POSTULANTE (el proxy mandaría a los demás a su panel de todos modos).
 */
export function sanitizarNextParaRol(next: unknown, rol: RolUsuario | null): string | null {
  const limpio = sanitizarNext(next)
  if (!limpio) return null
  if (limpio.startsWith(PREFIJO_EMPLEOS)) return limpio
  return rol === 'POSTULANTE' ? limpio : null
}

/** Token de `/empleos/{token}` si `destino` apunta a esa ruta; null si no. */
export function tokenDeDestinoEmpleos(destino: string): string | null {
  const m = /^\/empleos\/([^/?#]+)/.exec(destino)
  return m ? m[1] : null
}

/** `/iniciar-sesion?next=...` para mandar al login conservando el destino. */
export function urlIniciarSesionConNext(
  destino: string | null,
  extra?: Record<string, string>,
): string {
  const params = new URLSearchParams(extra)
  if (destino) params.set('next', destino)
  const qs = params.toString()
  return qs ? `/iniciar-sesion?${qs}` : '/iniciar-sesion'
}
