'use client'

import { useActionState } from 'react'
import { recuperarPassword } from '@/modules/auth/actions'
import { INITIAL_ACTION_STATE } from '@/lib/types/domain'



/**
 * Mismo marcado que `LoginForm`: es la misma pantalla, con un campo en vez de
 * dos. Antes esta ruta vivía en otro grupo y se dibujaba con el kit de la app
 * autenticada (tarjeta centrada, tipografía Inter), así que quien llegaba desde
 * "¿La olvidaste?" aterrizaba en una pantalla que no se parecía a la anterior.
 */
export function RecuperarPasswordForm() {
  const [state, action, pending] = useActionState(recuperarPassword, INITIAL_ACTION_STATE)

  const emailError = state && !state.success ? state.fieldErrors?.email?.[0] : undefined
  const generalError =
    state && !state.success && state.error && !emailError ? state.error : undefined

  // Respuesta deliberadamente ambigua: no revela si el email tiene cuenta.
  if (state?.success) {
    return (
      <div className="tid-alert tid-alert-info">
        Si existe una cuenta con ese email, te enviamos las instrucciones para restablecer la
        contraseña. Revisá tu bandeja de entrada y la carpeta de correo no deseado.
      </div>
    )
  }

  return (
    <form action={action} className="tid-panel">
      <div className="tid-field">
        <div className="tid-field-head">
          <label htmlFor="recuperar-email" className="tid-field-label">Email de tu cuenta</label>
        </div>
        <input
          id="recuperar-email"
          name="email"
          type="email"
          placeholder="tu@email.com"
          className="tid-input"
          data-error={emailError ? 'true' : undefined}
          aria-invalid={emailError ? 'true' : undefined}
          aria-describedby={emailError ? 'recuperar-email-error' : 'recuperar-email-hint'}
          defaultValue={state && !state.success ? (state.fieldErrors?._email?.[0] ?? '') : ''}
          autoComplete="email"
          required
        />
        <div id="recuperar-email-hint" className="tid-field-hint">
          Te llega un enlace para elegir una contraseña nueva. Vence en una hora.
        </div>
        {emailError && <div id="recuperar-email-error" className="tid-field-error">{emailError}</div>}
      </div>

      {generalError && <div className="tid-alert">{generalError}</div>}

      <button type="submit" className="tid-submit" disabled={pending}>
        {pending ? 'Enviando...' : 'Enviar instrucciones'}
      </button>
    </form>
  )
}
