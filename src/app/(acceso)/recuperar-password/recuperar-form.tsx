'use client'

import { useActionState } from 'react'
import { recuperarPassword } from '@/modules/auth/actions'
import type { ActionResult } from '@/lib/types/domain'

const initialState: ActionResult = { success: false, error: '' }

/**
 * Mismo marcado que `LoginForm`: es la misma pantalla, con un campo en vez de
 * dos. Antes esta ruta vivía en otro grupo y se dibujaba con el kit de la app
 * autenticada (tarjeta centrada, tipografía Inter), así que quien llegaba desde
 * "¿La olvidaste?" aterrizaba en una pantalla que no se parecía a la anterior.
 */
export function RecuperarPasswordForm() {
  const [state, action, pending] = useActionState(recuperarPassword, initialState)

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
          <span className="tid-field-label">Email de tu cuenta</span>
        </div>
        <input
          name="email"
          type="email"
          placeholder="tu@email.com"
          className="tid-input"
          data-error={emailError ? 'true' : undefined}
          defaultValue={state && !state.success ? (state.fieldErrors?._email?.[0] ?? '') : ''}
          autoComplete="email"
          required
        />
        <div className="tid-field-hint">
          Te llega un enlace para elegir una contraseña nueva. Vence en una hora.
        </div>
        {emailError && <div className="tid-field-error">{emailError}</div>}
      </div>

      {generalError && <div className="tid-alert">{generalError}</div>}

      <button type="submit" className="tid-submit" disabled={pending}>
        {pending ? 'Enviando...' : 'Enviar instrucciones'}
      </button>
    </form>
  )
}
