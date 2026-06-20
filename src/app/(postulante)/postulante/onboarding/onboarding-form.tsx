'use client'

import { useActionState } from 'react'
import { guardarDatosBasicos } from '@/modules/eneagrama/actions'
import { Button, Field, Input, Card, Alert } from '@/components/ui'
import { UserIcon } from '@/components/icons'
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

export function OnboardingForm({ perfil }: { perfil: Perfil }) {
  const [state, action, pending] = useActionState(guardarDatosBasicos, initialState)

  return (
    <form action={action}>
      <Card padding="lg">
        <div className="space-y-4">
          <Field
            label="Nombre completo"
            required
            error={state && !state.success ? state.fieldErrors?.nombre_completo?.[0] : undefined}
          >
            <Input
              name="nombre_completo"
              placeholder="Ej: María González"
              leftIcon={<UserIcon size={17} />}
              defaultValue={perfil?.nombre_completo ?? ''}
              status={state && !state.success && state.fieldErrors?.nombre_completo ? 'error' : undefined}
            />
          </Field>

          <Field
            label="Teléfono"
            error={state && !state.success ? state.fieldErrors?.telefono?.[0] : undefined}
          >
            <Input
              name="telefono"
              type="tel"
              placeholder="Ej: +54 9 261 000 0000"
              defaultValue={perfil?.telefono ?? ''}
            />
          </Field>

          <Field
            label="Tipo de puesto que buscás"
            error={state && !state.success ? state.fieldErrors?.especificidad_puesto?.[0] : undefined}
          >
            <Input
              name="especificidad_puesto"
              placeholder="Ej: Desarrollador Frontend, Analista de RRHH…"
              defaultValue={perfil?.especificidad_puesto ?? ''}
            />
          </Field>

          <Field
            label="LinkedIn"
            error={state && !state.success ? state.fieldErrors?.enlace_linkedin?.[0] : undefined}
          >
            <Input
              name="enlace_linkedin"
              type="url"
              placeholder="https://linkedin.com/in/tu-perfil"
              defaultValue={perfil?.enlace_linkedin ?? ''}
            />
          </Field>

          <Field
            label="Portfolio o sitio web"
            error={state && !state.success ? state.fieldErrors?.portfolio?.[0] : undefined}
          >
            <Input
              name="portfolio"
              type="url"
              placeholder="https://mi-portfolio.com"
              defaultValue={perfil?.portfolio ?? ''}
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
        {pending ? 'Guardando...' : 'Continuar al Eneagrama →'}
      </Button>
    </form>
  )
}
