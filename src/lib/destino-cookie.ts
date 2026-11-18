import 'server-only'
import { cookies } from 'next/headers'
import { sanitizarNext } from './sanitizar-next'

/**
 * Cookie `miliors-destino`: a dónde seguir después de registrarse o iniciar sesión.
 *
 * El embudo de una cuenta nueva pasa por verificación de email, onboarding,
 * Eneagrama y certificado, y el mail puede abrirse en otro navegador. Con la
 * cookie, el panel del postulante puede mostrar "Seguí con tu postulación" aunque
 * el `next` original se haya perdido en el camino.
 *
 * Sólo guarda un destino ya saneado (`sanitizarNext`) y se vuelve a sanear al leer,
 * por si alguien la edita a mano.
 *
 * Las escrituras (set/delete) sólo se pueden hacer en una server action o un route
 * handler, nunca mientras se renderiza un Server Component: por eso el aviso borra
 * la cookie con una action (`descartarDestino`), no al dibujarse.
 */
export const COOKIE_DESTINO = 'miliors-destino'
const SIETE_DIAS = 60 * 60 * 24 * 7

export async function guardarDestino(destino: string): Promise<void> {
  const limpio = sanitizarNext(destino)
  if (!limpio) return
  const store = await cookies()
  store.set(COOKIE_DESTINO, limpio, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SIETE_DIAS,
  })
}

/** Destino guardado y saneado, o null. Sólo lectura: se puede llamar al renderizar. */
export async function leerDestino(): Promise<string | null> {
  const store = await cookies()
  return sanitizarNext(store.get(COOKIE_DESTINO)?.value)
}

export async function borrarDestino(): Promise<void> {
  const store = await cookies()
  store.delete(COOKIE_DESTINO)
}
