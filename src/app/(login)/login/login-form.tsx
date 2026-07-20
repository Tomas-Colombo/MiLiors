'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { iniciarSesion } from '@/modules/auth/actions'
import { EyeIcon, EyeOffIcon } from '@/components/icons'
import type { ActionResult } from '@/lib/types/domain'

const initialState: ActionResult = { success: false, error: '' }

export function LoginForm() {
  const [state, action, pending] = useActionState(iniciarSesion, initialState)
  const [showPass, setShowPass] = useState(false)

  const emailError = state && !state.success ? state.fieldErrors?.email?.[0] : undefined
  const passwordError = state && !state.success ? state.fieldErrors?.password?.[0] : undefined
  const generalError =
    state && !state.success && state.error && !emailError && !passwordError ? state.error : undefined

  return (
    <form action={action}>
      <div className="tid-field" style={{ marginTop: 0 }}>
        <div className="tid-field-head">
          <span className="tid-field-label">Email</span>
        </div>
        <input
          name="email"
          type="email"
          placeholder="nombre@empresa.com"
          className="tid-input"
          data-error={emailError ? 'true' : undefined}
          defaultValue={state && !state.success ? (state.fieldErrors?._email?.[0] ?? '') : ''}
          autoComplete="email"
        />
        {emailError && <div className="tid-field-error">{emailError}</div>}
      </div>

      <div className="tid-field">
        <div className="tid-field-head">
          <span className="tid-field-label">Contraseña</span>
          <Link href="/recuperar-password" className="tid-forgot-link">
            ¿La olvidaste?
          </Link>
        </div>
        <div className="tid-input-wrap">
          <input
            name="password"
            type={showPass ? 'text' : 'password'}
            placeholder="••••••••••"
            className="tid-input tid-input-pass"
            data-error={passwordError ? 'true' : undefined}
            autoComplete="current-password"
          />
          <button
            type="button"
            className="tid-pass-toggle"
            onClick={() => setShowPass((v) => !v)}
            aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPass ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
            {showPass ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        {passwordError && <div className="tid-field-error">{passwordError}</div>}
      </div>

      {generalError && <div className="tid-alert">{generalError}</div>}

      <button type="submit" className="tid-submit" disabled={pending}>
        {pending ? 'Ingresando...' : 'Ingresar'}
      </button>
    </form>
  )
}
