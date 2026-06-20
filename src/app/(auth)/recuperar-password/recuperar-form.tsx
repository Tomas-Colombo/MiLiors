'use client'

import { useActionState } from 'react'
import { recuperarPassword } from '@/modules/auth/actions'
import { Button, Field, Input, Card, Alert } from '@/components/ui'
import { MailIcon } from '@/components/icons'
import type { ActionResult } from '@/lib/types/domain'

const initialState: ActionResult = { success: false, error: '' }

export function RecuperarPasswordForm() {
  const [state, action, pending] = useActionState(recuperarPassword, initialState)

  if (state?.success) {
    return (
      <Alert tone="success" title="Email enviado">
        Si existe una cuenta con ese email, recibirás las instrucciones para restablecer tu
        contraseña.
      </Alert>
    )
  }

  return (
    <form action={action}>
      <Card padding="lg">
        <div className="space-y-4">
          <Field
            label="Email de tu cuenta"
            required
            error={state && !state.success ? state.fieldErrors?.email?.[0] : undefined}
          >
            <Input
              name="email"
              type="email"
              placeholder="tucuenta@email.com"
              leftIcon={<MailIcon size={17} />}
              status={state && !state.success && state.fieldErrors?.email ? 'error' : undefined}
              autoComplete="email"
            />
          </Field>

          {state && !state.success && state.error && !state.fieldErrors && (
            <Alert tone="error" title={state.error} />
          )}
        </div>
      </Card>

      <Button
        type="submit"
        className="mt-4 w-full"
        size="lg"
        loading={pending}
        disabled={pending}
      >
        {pending ? 'Enviando...' : 'Enviar instrucciones'}
      </Button>
    </form>
  )
}
