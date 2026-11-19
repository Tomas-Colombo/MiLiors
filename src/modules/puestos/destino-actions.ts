'use server'

import { borrarDestino } from '@/lib/destino-cookie'

/**
 * Descarta el aviso "Seguí con tu postulación": borra la cookie `miliors-destino`.
 * Es una server action porque las cookies sólo se escriben ahí o en un route
 * handler, nunca al renderizar el aviso. Next vuelve a dibujar la página con la
 * cookie ya borrada.
 */
export async function descartarDestino(): Promise<void> {
  await borrarDestino()
}
