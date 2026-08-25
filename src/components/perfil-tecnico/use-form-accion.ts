'use client'

import { useActionState } from 'react'
import { INITIAL_STATE } from './form-estado'
import type { ActionResult } from '@/lib/types/domain'

export type AccionFormulario = (prev: ActionResult, formData: FormData) => Promise<ActionResult>

/**
 * Envía un formulario y, si la acción sale bien, avisa. Es lo que cierra el
 * panel de alta o sale del modo edición.
 *
 * Estaba escrito igual siete veces en `perfil-tecnico-ui.tsx`, una por
 * formulario.
 *
 * `onSuccess` no hace falta memoizarlo: React invoca esta función en cada envío
 * y no la guarda por identidad, así que un arrow inline en el punto de llamada
 * se comporta igual que uno estable.
 */
export function useFormAccion(accion: AccionFormulario, onSuccess: () => void) {
  return useActionState(async (prev: ActionResult, formData: FormData) => {
    const result = await accion(prev, formData)
    if (result.success) onSuccess()
    return result
  }, INITIAL_STATE)
}
