'use client'

import { useActionState } from 'react'
import { INITIAL_ACTION_STATE } from '@/lib/types/domain'
import type { ActionResult } from '@/lib/types/domain'

export type AccionFormulario<T = void> = (
  prev: ActionResult<T>,
  formData: FormData
) => Promise<ActionResult<T>>

/**
 * Hook canónico para invocar una Server Action desde un formulario y ejecutar
 * una acción secundaria síncronamente al tener éxito (onSuccess), eliminando la
 * necesidad de utilizar useEffect para observar `state.success`.
 *
 * `onSuccess` no requiere memoización: React invoca la acción en cada envío sin
 * comparar su identidad, por lo que callbacks inline no sufren problemas de re-render.
 */
export function useFormAccion<T = void>(
  accion: AccionFormulario<T>,
  onSuccess?: (data?: T) => void
) {
  return useActionState(async (prev: ActionResult<T>, formData: FormData) => {
    const result = await accion(prev, formData)
    if (result.success && onSuccess) {
      onSuccess(result.data)
    }
    return result
  }, INITIAL_ACTION_STATE as ActionResult<T>)
}
