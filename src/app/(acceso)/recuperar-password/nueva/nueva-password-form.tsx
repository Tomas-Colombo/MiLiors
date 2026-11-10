'use client'

import { useActionState, useState } from 'react'
import { establecerPasswordNueva } from '@/modules/auth/actions'
import { EyeIcon, EyeOffIcon } from '@/components/icons'
import { INITIAL_ACTION_STATE } from '@/lib/types/domain'



/**
 * Contraseña nueva al final del flujo de recuperación. Mismo marcado `tid-*`
 * que el alta de cuenta —incluido el ojo para mostrar la contraseña— porque es
 * la misma pantalla de acceso: cambiar de paso no cambia de lenguaje visual.
 *
 * No hay estado de éxito: cuando la action guarda, redirige a /iniciar-sesion
 * con el aviso puesto.
 */
export function NuevaPasswordForm() {
  const [state, action, pending] = useActionState(establecerPasswordNueva, INITIAL_ACTION_STATE)
  const [showPass, setShowPass] = useState(false)

  const errores = state && !state.success ? state.fieldErrors : undefined
  const passwordError = errores?.password?.[0]
  const confirmError = errores?.confirmPassword?.[0]
  const generalError =
    state && !state.success && state.error && !passwordError && !confirmError
      ? state.error
      : undefined

  return (
    <form action={action} className="tid-panel">
      <div className="tid-field">
        <div className="tid-field-head">
          <label htmlFor="nueva-password" className="tid-field-label">Contraseña nueva</label>
        </div>
        <div className="tid-input-wrap">
          <input
            id="nueva-password"
            name="password"
            type={showPass ? 'text' : 'password'}
            placeholder="••••••••••"
            className="tid-input tid-input-pass"
            data-error={passwordError ? 'true' : undefined}
            aria-invalid={passwordError ? 'true' : undefined}
            aria-describedby={passwordError ? 'nueva-password-error' : 'nueva-password-hint'}
            autoComplete="new-password"
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
        {passwordError ? (
          <div id="nueva-password-error" className="tid-field-error">{passwordError}</div>
        ) : (
          <div id="nueva-password-hint" className="tid-field-hint">Mínimo 8 caracteres, una mayúscula y un número.</div>
        )}
      </div>

      <div className="tid-field">
        <div className="tid-field-head">
          <label htmlFor="nueva-confirm-password" className="tid-field-label">Confirmar contraseña</label>
        </div>
        <input
          id="nueva-confirm-password"
          name="confirmPassword"
          type={showPass ? 'text' : 'password'}
          placeholder="••••••••••"
          className="tid-input"
          data-error={confirmError ? 'true' : undefined}
          aria-invalid={confirmError ? 'true' : undefined}
          aria-describedby={confirmError ? 'nueva-confirm-password-error' : undefined}
          autoComplete="new-password"
        />
        {confirmError && <div id="nueva-confirm-password-error" className="tid-field-error">{confirmError}</div>}
      </div>

      {generalError && <div className="tid-alert">{generalError}</div>}

      <button type="submit" className="tid-submit" disabled={pending}>
        {pending ? 'Guardando...' : 'Guardar contraseña'}
      </button>
    </form>
  )
}
