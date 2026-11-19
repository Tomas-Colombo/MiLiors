import 'server-only'
import { cookies } from 'next/headers'
import { sanitizarNext } from './sanitizar-next'
import { COOKIE_DESTINO } from './destino-cookie-nombre'

export { COOKIE_DESTINO }

/**
 * Cookie `miliors-destino`: a dónde seguir después de registrarse o iniciar sesión.
 *
 * El embudo de una cuenta nueva pasa por verificación de email, onboarding,
 * Eneagrama y certificado, y el mail puede abrirse en otro navegador. Con la
 * cookie, el panel del postulante puede mostrar "Seguí con tu postulación" aunque
 * el `next` original se haya perdido en el camino.
 *
 * Valor: JSON `{ d: destino, u: usuarioId | null }`. Sólo guarda un destino ya
 * saneado (`sanitizarNext`) y se vuelve a sanear al leer, por si alguien la edita a
 * mano; un valor ilegible (incluido el formato viejo, un string suelto) se ignora.
 *
 * Dueño (`u`): el registro todavía no tiene sesión, así que guarda `u: null`; el
 * primer login de esta cookie la ata a ese usuario (`adoptarDestino`). Si el
 * navegador lo comparte otra persona, la cookie de otro usuario se ignora y se borra.
 *
 * Las escrituras (set/delete) sólo se pueden hacer en una server action o un route
 * handler, nunca mientras se renderiza un Server Component: por eso el aviso borra
 * la cookie con una action (`descartarDestino`), no al dibujarse.
 */
const SIETE_DIAS = 60 * 60 * 24 * 7

type DestinoGuardado = { destino: string; usuarioId: string | null }

function parsear(valor: string | undefined): DestinoGuardado | null {
  if (!valor) return null
  try {
    const crudo: unknown = JSON.parse(valor)
    if (!crudo || typeof crudo !== 'object') return null
    const { d, u } = crudo as { d?: unknown; u?: unknown }
    if (typeof d !== 'string') return null
    if (u !== null && typeof u !== 'string') return null
    const destino = sanitizarNext(d)
    return destino ? { destino, usuarioId: u } : null
  } catch {
    return null
  }
}

async function escribir(destino: string, usuarioId: string | null): Promise<void> {
  const store = await cookies()
  store.set(COOKIE_DESTINO, JSON.stringify({ d: destino, u: usuarioId }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SIETE_DIAS,
  })
}

/** Guarda el destino (saneado) a nombre de `usuarioId`, o sin dueño todavía (`null`). */
export async function guardarDestino(destino: string, usuarioId: string | null = null): Promise<void> {
  const limpio = sanitizarNext(destino)
  if (!limpio) return
  await escribir(limpio, usuarioId)
}

/**
 * Destino guardado y saneado, o null. Sólo lectura: se puede llamar al renderizar.
 * Ignora la cookie de otro usuario (sin dueño o del mismo usuario sí vale).
 */
export async function leerDestino(usuarioId: string | null): Promise<string | null> {
  const store = await cookies()
  const guardado = parsear(store.get(COOKIE_DESTINO)?.value)
  if (!guardado) return null
  if (guardado.usuarioId && guardado.usuarioId !== usuarioId) return null
  return guardado.destino
}

/**
 * Para el login (server action): devuelve el destino que le corresponde a `usuarioId`.
 * Sin dueño, lo ata a este usuario; de otro usuario, lo ignora y borra la cookie.
 */
export async function adoptarDestino(usuarioId: string): Promise<string | null> {
  const store = await cookies()
  const guardado = parsear(store.get(COOKIE_DESTINO)?.value)
  if (!guardado) return null
  if (guardado.usuarioId && guardado.usuarioId !== usuarioId) {
    store.delete(COOKIE_DESTINO)
    return null
  }
  if (!guardado.usuarioId) await escribir(guardado.destino, usuarioId)
  return guardado.destino
}

export async function borrarDestino(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE_DESTINO)
}
