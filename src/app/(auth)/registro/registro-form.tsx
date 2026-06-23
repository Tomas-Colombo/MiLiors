'use client'

import { useActionState, useState } from 'react'
import { registrarUsuario } from '@/modules/auth/actions'
import { Button, Field, Input, Card, Alert } from '@/components/ui'
import { UserIcon, BuildingIcon, MailIcon, LockIcon } from '@/components/icons'
import type { ActionResult } from '@/lib/types/domain'

const initialState: ActionResult = { success: false, error: '' }

export function RegistroForm() {
  const [state, action, pending] = useActionState(registrarUsuario, initialState)
  const [rol, setRol] = useState<'POSTULANTE' | 'RECLUTADOR' | null>(null)

  return (
    <div className="space-y-4">
      {/* Selector de rol */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setRol('POSTULANTE')}
          className={[
            'flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-sm font-semibold transition-all',
            rol === 'POSTULANTE'
              ? 'border-primary-600 bg-primary-50 text-primary-600'
              : 'border-neutral-200 bg-white text-soft hover:border-neutral-300',
          ].join(' ')}
        >
          <UserIcon size={24} />
          <span>Postulante</span>
          <span className="text-xs font-normal text-muted">Busco trabajo</span>
        </button>
        <button
          type="button"
          onClick={() => setRol('RECLUTADOR')}
          className={[
            'flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-sm font-semibold transition-all',
            rol === 'RECLUTADOR'
              ? 'border-primary-600 bg-primary-50 text-primary-600'
              : 'border-neutral-200 bg-white text-soft hover:border-neutral-300',
          ].join(' ')}
        >
          <BuildingIcon size={24} />
          <span>Empresa</span>
          <span className="text-xs font-normal text-muted">Busco talento</span>
        </button>
      </div>

      {/* Formulario */}
      <form action={action}>
        {/* Input oculto para el rol */}
        <input type="hidden" name="rol" value={rol ?? ''} />

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
              hint="Mínimo 8 caracteres, una mayúscula y un número."
            >
              <Input
                name="password"
                type="password"
                placeholder="••••••••"
                leftIcon={<LockIcon size={17} />}
                status={state && !state.success && state.fieldErrors?.password ? 'error' : undefined}
                autoComplete="new-password"
              />
            </Field>

            <Field
              label="Confirmar contraseña"
              required
              error={state && !state.success ? state.fieldErrors?.confirmPassword?.[0] : undefined}
            >
              <Input
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                leftIcon={<LockIcon size={17} />}
                status={
                  state && !state.success && state.fieldErrors?.confirmPassword ? 'error' : undefined
                }
                autoComplete="new-password"
              />
            </Field>

            {/* Error general */}
            {state && !state.success && state.error && !state.fieldErrors?.email && !state.fieldErrors?.password && !state.fieldErrors?.confirmPassword && !state.fieldErrors?.rol && (
              <Alert tone="error" title={state.error} />
            )}

            {/* Error si no eligió rol */}
            {state && !state.success && state.fieldErrors?.rol && (
              <Alert tone="error" title={state.fieldErrors.rol[0]} />
            )}
          </div>
        </Card>

        <Button
          type="submit"
          className="mt-4 w-full"
          size="lg"
          loading={pending}
          disabled={pending || !rol}
        >
          {pending ? 'Creando cuenta...' : 'Crear cuenta'}
        </Button>
      </form>
    </div>
  )
}
