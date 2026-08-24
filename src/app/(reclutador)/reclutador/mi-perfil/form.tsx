'use client'

import { useActionState } from 'react'
import { actualizarPerfilReclutador } from '@/modules/perfil/actions'
import { Button, Field, Input, Alert } from '@/components/ui'
import type { ActionResult } from '@/lib/types/domain'

type Perfil = { nombre_reclutador: string } | null

const initialState: ActionResult = { success: false, error: '' }

export function PerfilReclutadorForm({ perfil }: { perfil: Perfil }) {
  const [state, action, pending] = useActionState(actualizarPerfilReclutador, initialState)
  const fieldErrors = !state.success && state.fieldErrors ? state.fieldErrors : {}

  return (
    <form action={action} className="space-y-4">
      {state.success && (
        <Alert tone="success" title="¡Datos actualizados correctamente!" />
      )}

      {!state.success && state.error && !state.fieldErrors && (
        <Alert tone="error" title={state.error} />
      )}

      <Field
        label="Tu nombre"
        htmlFor="nombre_reclutador"
        required
        error={fieldErrors.nombre_reclutador?.[0]}
      >
        <Input
          id="nombre_reclutador"
          name="nombre_reclutador"
          placeholder="Ej: Juan Pérez"
          defaultValue={perfil?.nombre_reclutador ?? ''}
          status={fieldErrors.nombre_reclutador ? 'error' : 'default'}
        />
      </Field>

      <div className="pt-2">
        <Button
          type="submit"
          className="w-full"
          size="lg"
          loading={pending}
          disabled={pending}
        >
          {pending ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  )
}
