'use client'

import { useActionState } from 'react'
import { actualizarPerfilPostulante } from '@/modules/perfil/actions'
import { Button, Field, Input, Alert } from '@/components/ui'
import { UserIcon, MailIcon } from '@/components/icons'
import type { ActionResult } from '@/lib/types/domain'

type Perfil = {
  id: string
  nombre_completo: string
  telefono: string | null
  especificidad_puesto: string | null
  enlace_linkedin: string | null
  portfolio: string | null
} | null

const initialState: ActionResult = { success: false, error: '' }

export function PerfilPostulanteForm({ perfil, email }: { perfil: Perfil; email: string }) {
  const [state, action, pending] = useActionState(actualizarPerfilPostulante, initialState)
  const fieldErrors = !state.success && state.fieldErrors ? state.fieldErrors : {}

  return (
    <form action={action} className="space-y-4">
      {state.success && (
        <Alert tone="success" title="¡Datos actualizados correctamente!" />
      )}

      {!state.success && state.error && !state.fieldErrors && (
        <Alert tone="error" title={state.error} />
      )}

      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          value={email}
          readOnly
          disabled
          leftIcon={<MailIcon size={17} />}
          className="opacity-60 cursor-not-allowed"
        />
        <p className="mt-1 text-xs text-muted">El email no se puede cambiar.</p>
      </Field>

      <Field
        label="Nombre completo"
        htmlFor="nombre_completo"
        required
        error={fieldErrors.nombre_completo?.[0]}
      >
        <Input
          id="nombre_completo"
          name="nombre_completo"
          placeholder="Ej: María González"
          leftIcon={<UserIcon size={17} />}
          defaultValue={perfil?.nombre_completo ?? ''}
          status={fieldErrors.nombre_completo ? 'error' : 'default'}
        />
      </Field>

      <Field
        label="Teléfono"
        htmlFor="telefono"
        error={fieldErrors.telefono?.[0]}
      >
        <Input
          id="telefono"
          name="telefono"
          type="tel"
          placeholder="Ej: +54 9 261 000 0000"
          defaultValue={perfil?.telefono ?? ''}
          status={fieldErrors.telefono ? 'error' : 'default'}
        />
      </Field>

      <Field
        label="Tipo de puesto que buscás"
        htmlFor="especificidad_puesto"
        error={fieldErrors.especificidad_puesto?.[0]}
      >
        <Input
          id="especificidad_puesto"
          name="especificidad_puesto"
          placeholder="Ej: Desarrollador Frontend, Analista de RRHH…"
          defaultValue={perfil?.especificidad_puesto ?? ''}
          status={fieldErrors.especificidad_puesto ? 'error' : 'default'}
        />
      </Field>

      <Field
        label="LinkedIn"
        htmlFor="enlace_linkedin"
        error={fieldErrors.enlace_linkedin?.[0]}
      >
        <Input
          id="enlace_linkedin"
          name="enlace_linkedin"
          type="url"
          placeholder="https://linkedin.com/in/tu-perfil"
          defaultValue={perfil?.enlace_linkedin ?? ''}
          status={fieldErrors.enlace_linkedin ? 'error' : 'default'}
        />
      </Field>

      <Field
        label="Portfolio o sitio web"
        htmlFor="portfolio"
        error={fieldErrors.portfolio?.[0]}
      >
        <Input
          id="portfolio"
          name="portfolio"
          type="url"
          placeholder="https://mi-portfolio.com"
          defaultValue={perfil?.portfolio ?? ''}
          status={fieldErrors.portfolio ? 'error' : 'default'}
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
          {pending ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  )
}
