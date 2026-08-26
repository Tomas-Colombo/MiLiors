'use client'

import { useActionState, useState } from 'react'
import { registrarUsuario } from '@/modules/auth/actions'
import type { RegistroPendiente } from '@/modules/auth/schema'
import { UserIcon, BuildingIcon, EyeIcon, EyeOffIcon } from '@/components/icons'
import type { ActionResult } from '@/lib/types/domain'

const initialState: ActionResult<RegistroPendiente> = { success: false, error: '' }

/**
 * Alta de cuenta dentro de la pantalla de acceso — mismos campos y estilos
 * (`tid-*`) que el inicio de sesión, para que cambiar de pestaña no cambie de
 * lenguaje visual.
 */
export function RegistroForm() {
  const [state, action, pending] = useActionState(registrarUsuario, initialState)
  const [rol, setRol] = useState<'POSTULANTE' | 'RECLUTADOR' | null>(null)
  const [showPass, setShowPass] = useState(false)

  const errores = state && !state.success ? state.fieldErrors : undefined
  const emailError = errores?.email?.[0]
  const passwordError = errores?.password?.[0]
  const confirmError = errores?.confirmPassword?.[0]
  const rolError = errores?.rol?.[0]
  const generalError =
    state && !state.success && state.error && !emailError && !passwordError && !confirmError && !rolError
      ? state.error
      : undefined

  // Cuenta creada pero sin sesión: Supabase ya mandó el mail de verificación.
  // Antes acá había un redirect al onboarding del rol que el proxy rebotaba a
  // la pantalla de acceso, sin explicar nada. Mismo tratamiento que
  // `RecuperarPasswordForm`: el formulario se reemplaza por el aviso.
  if (state?.success) {
    return (
      <div className="tid-alert tid-alert-info">
        Creamos tu cuenta y te enviamos un mail de verificación a{' '}
        <strong>{state.data.email}</strong>. Abrí el enlace del mail para activarla y después
        ingresá con tu email y contraseña. Si no llega en unos minutos, revisá la carpeta de correo
        no deseado.
      </div>
    )
  }

  return (
    <form action={action} className="tid-panel">
      <input type="hidden" name="rol" value={rol ?? ''} />

      <div className="tid-field-label">¿Cómo vas a usar MiLiors?</div>
      <div className="tid-roles">
        <button
          type="button"
          className="tid-role"
          data-active={rol === 'POSTULANTE'}
          onClick={() => setRol('POSTULANTE')}
        >
          <UserIcon size={20} />
          <span className="tid-role-name">Postulante</span>
          <span className="tid-role-desc">Busco trabajo</span>
        </button>
        <button
          type="button"
          className="tid-role"
          data-active={rol === 'RECLUTADOR'}
          onClick={() => setRol('RECLUTADOR')}
        >
          <BuildingIcon size={20} />
          <span className="tid-role-name">Empresa</span>
          <span className="tid-role-desc">Busco talento</span>
        </button>
      </div>
      {rolError && <div className="tid-field-error">{rolError}</div>}

      <div className="tid-field">
        <div className="tid-field-head">
          <span className="tid-field-label">Email</span>
        </div>
        <input
          name="email"
          type="email"
          placeholder="tu@email.com"
          className="tid-input"
          data-error={emailError ? 'true' : undefined}
          defaultValue={errores?._email?.[0] ?? ''}
          autoComplete="email"
        />
        {emailError && <div className="tid-field-error">{emailError}</div>}
      </div>

      <div className="tid-field">
        <div className="tid-field-head">
          <span className="tid-field-label">Contraseña</span>
        </div>
        <div className="tid-input-wrap">
          <input
            name="password"
            type={showPass ? 'text' : 'password'}
            placeholder="••••••••••"
            className="tid-input tid-input-pass"
            data-error={passwordError ? 'true' : undefined}
            autoComplete="new-password"
          />
          <button
            type="button"
            className="tid-pass-toggle"
            onClick={() => setShowPass(v => !v)}
            aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPass ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
            {showPass ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
        {passwordError ? (
          <div className="tid-field-error">{passwordError}</div>
        ) : (
          <div className="tid-field-hint">Mínimo 8 caracteres, una mayúscula y un número.</div>
        )}
      </div>

      <div className="tid-field">
        <div className="tid-field-head">
          <span className="tid-field-label">Confirmar contraseña</span>
        </div>
        <input
          name="confirmPassword"
          type={showPass ? 'text' : 'password'}
          placeholder="••••••••••"
          className="tid-input"
          data-error={confirmError ? 'true' : undefined}
          autoComplete="new-password"
        />
        {confirmError && <div className="tid-field-error">{confirmError}</div>}
      </div>

      {generalError && <div className="tid-alert">{generalError}</div>}

      {/* Sin `disabled` por falta de rol: un botón desvaído no explica nada y
          además rompe el azul que comparte con "Ingresar". Si no eligió tipo de
          cuenta, el schema devuelve el error y se muestra sobre el selector. */}
      <button type="submit" className="tid-submit" disabled={pending}>
        {pending ? 'Creando cuenta...' : 'Crear cuenta'}
      </button>
    </form>
  )
}
