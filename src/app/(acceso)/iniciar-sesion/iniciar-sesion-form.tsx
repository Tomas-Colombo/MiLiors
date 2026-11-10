'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { iniciarSesion } from '@/modules/auth/actions'
import { EyeIcon, EyeOffIcon } from '@/components/icons'
import { INITIAL_ACTION_STATE } from '@/lib/types/domain'

export function IniciarSesionForm() {
  const [state, action, pending] = useActionState(iniciarSesion, INITIAL_ACTION_STATE)
  const [showPass, setShowPass] = useState(false)

  const emailError = state && !state.success ? state.fieldErrors?.email?.[0] : undefined
  const passwordError = state && !state.success ? state.fieldErrors?.password?.[0] : undefined
  const generalError =
    state && !state.success && state.error && !emailError && !passwordError ? state.error : undefined

  return (
    <form action={action} className="tid-panel">
      <div className="tid-field">
        <div className="tid-field-head">
          <label htmlFor="login-email" className="tid-field-label">Email</label>
        </div>
        <input
          id="login-email"
          name="email"
          type="email"
          placeholder="tu@email.com"
          className="tid-input"
          data-error={emailError ? 'true' : undefined}
          aria-invalid={emailError ? 'true' : undefined}
          aria-describedby={emailError ? 'login-email-error' : undefined}
          defaultValue={state && !state.success ? (state.fieldErrors?._email?.[0] ?? '') : ''}
          autoComplete="email"
        />
        {emailError && <div id="login-email-error" className="tid-field-error">{emailError}</div>}
      </div>

      <div className="tid-field">
        <div className="tid-field-head">
          <label htmlFor="login-password" className="tid-field-label">Contraseña</label>
          <Link href="/recuperar-password" className="tid-forgot-link">
            ¿La olvidaste?
          </Link>
        </div>
        <div className="tid-input-wrap">
          <input
            id="login-password"
            name="password"
            type={showPass ? 'text' : 'password'}
            placeholder="••••••••••"
            className="tid-input tid-input-pass"
            data-error={passwordError ? 'true' : undefined}
            aria-invalid={passwordError ? 'true' : undefined}
            aria-describedby={passwordError ? 'login-password-error' : undefined}
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
        {passwordError && <div id="login-password-error" className="tid-field-error">{passwordError}</div>}
      </div>

      {generalError && <div className="tid-alert">{generalError}</div>}

      <button type="submit" className="tid-submit" disabled={pending}>
        {pending ? 'Ingresando...' : 'Ingresar'}
      </button>
    </form>
  )
}
