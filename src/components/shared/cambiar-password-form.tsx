'use client'

import { useActionState, useState } from 'react'
import { cambiarPassword } from '@/modules/perfil/actions'
import { Button, Field, Input, Alert } from '@/components/ui'
import { LockIcon, EyeIcon, EyeOffIcon } from '@/components/icons'
import type { ActionResult } from '@/lib/types/domain'

const initialState: ActionResult = { success: false, error: '' }

export function CambiarPasswordForm() {
  const [state, action, pending] = useActionState(cambiarPassword, initialState)
  const fieldErrors = !state.success && state.fieldErrors ? state.fieldErrors : {}
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  return (
    <form action={action} className="space-y-4">
      {state.success && (
        <Alert tone="success" title="¡Contraseña actualizada correctamente!" />
      )}

      {!state.success && state.error && !state.fieldErrors && (
        <Alert tone="error" title={state.error} />
      )}

      {/* El hint repite las reglas de `passwordSchema`. Tienen que seguir a ese
          schema: si el campo promete menos de lo que valida, el error aparece
          recién al enviar y parece arbitrario. */}
      <Field
        label="Nueva contraseña"
        htmlFor="nueva_password"
        required
        hint="Mínimo 8 caracteres, una mayúscula y un número."
        error={fieldErrors.nueva_password?.[0]}
      >
        <Input
          id="nueva_password"
          name="nueva_password"
          type={showNew ? 'text' : 'password'}
          placeholder="Elegí una contraseña nueva"
          leftIcon={<LockIcon size={17} />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="text-muted hover:text-ink transition-colors"
              aria-label={showNew ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showNew ? <EyeOffIcon size={17} /> : <EyeIcon size={17} />}
            </button>
          }
          status={fieldErrors.nueva_password ? 'error' : 'default'}
        />
      </Field>

      <Field
        label="Confirmar nueva contraseña"
        htmlFor="confirmar_password"
        required
        error={fieldErrors.confirmar_password?.[0]}
      >
        <Input
          id="confirmar_password"
          name="confirmar_password"
          type={showConfirm ? 'text' : 'password'}
          placeholder="Repetí la nueva contraseña"
          leftIcon={<LockIcon size={17} />}
          rightIcon={
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="text-muted hover:text-ink transition-colors"
              aria-label={showConfirm ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showConfirm ? <EyeOffIcon size={17} /> : <EyeIcon size={17} />}
            </button>
          }
          status={fieldErrors.confirmar_password ? 'error' : 'default'}
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
          {pending ? 'Guardando...' : 'Cambiar contraseña'}
        </Button>
      </div>
    </form>
  )
}
