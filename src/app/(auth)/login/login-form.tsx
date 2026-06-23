'use client'

import { useActionState } from 'react'
import { iniciarSesion } from '@/modules/auth/actions'
import { Button, Field, Input, Card, Alert } from '@/components/ui'
import { MailIcon, LockIcon } from '@/components/icons'
import type { ActionResult } from '@/lib/types/domain'

const initialState: ActionResult = { success: false, error: '' }

export function LoginForm() {
  const [state, action, pending] = useActionState(iniciarSesion, initialState)

  return (
    <form action={action}>
      <Card padding="lg">
        <div className="space-y-4">
          <Field
            label="Email"
            required
            error={state && !state.success ? state.fieldErrors?.email?.[0] : undefined}
          >
            <Input
              name="email"
              type="email"
              placeholder="tucuenta@email.com"
              leftIcon={<MailIcon size={17} />}
              defaultValue={state && !state.success ? (state.fieldErrors?._email?.[0] ?? '') : ''}
              status={state && !state.success && state.fieldErrors?.email ? 'error' : undefined}
              autoComplete="email"
            />
          </Field>

          <Field
            label="Contraseña"
            required
            error={state && !state.success ? state.fieldErrors?.password?.[0] : undefined}
          >
            <Input
              name="password"
              type="password"
              placeholder="••••••••"
              leftIcon={<LockIcon size={17} />}
              status={state && !state.success && state.fieldErrors?.password ? 'error' : undefined}
              autoComplete="current-password"
            />
          </Field>

          {state && !state.success && state.error && !state.fieldErrors?.email && !state.fieldErrors?.password && (
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
        {pending ? 'Ingresando...' : 'Ingresar'}
      </Button>
    </form>
  )
}
