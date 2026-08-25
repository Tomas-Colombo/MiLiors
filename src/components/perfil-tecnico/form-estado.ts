import type { ActionResult } from '@/lib/types/domain'

export const INITIAL_STATE: ActionResult = { success: false, error: '' }

/**
 * Error de un campo puntual, o undefined.
 *
 * El guard `state.success === false` no es decorativo: `ActionResult` es una
 * unión discriminada y sin él TypeScript no deja llegar a `fieldErrors`. Estaba
 * escrito a mano en cada uno de los ~25 campos del perfil técnico.
 */
export function errorDe(state: ActionResult, campo: string): string | undefined {
  return state.success === false ? state.fieldErrors?.[campo]?.[0] : undefined
}

/**
 * Error general del formulario: el que no pertenece a ningún campo. Si vinieron
 * errores por campo, cada uno se muestra en su lugar y este se calla.
 */
export function errorGeneral(state: ActionResult): string | undefined {
  if (state.success !== false) return undefined
  return state.error && !state.fieldErrors ? state.error : undefined
}
