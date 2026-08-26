'use client'

import { useActionState } from 'react'
import { guardarDatosBasicos } from '@/modules/eneagrama/actions'
import { Button, Field, Input, Card, Alert } from '@/components/ui'
import {
  UbicacionSelector,
  type ProvinciaOption,
  type UbicacionInicial,
} from '@/components/shared/ubicacion-selector'
import { CarreraSelector, type CarreraOption } from '@/components/shared/carrera-selector'
import { UserIcon } from '@/components/icons'
import type { ActionResult } from '@/lib/types/domain'

type Perfil = {
  id: string
  nombre_completo: string
  telefono: string | null
  carrera_id: string | null
  carrera_otra: string | null
  enlace_linkedin: string | null
  portfolio: string | null
  localidad_id: string | null
  provincia_id: string | null
} | null

const initialState: ActionResult = { success: false, error: '' }

export function OnboardingForm({
  perfil,
  provincias,
  carreras,
  ubicacionInicial,
}: {
  perfil: Perfil
  provincias: ProvinciaOption[]
  carreras: CarreraOption[]
  ubicacionInicial: UbicacionInicial | null
}) {
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

          <UbicacionSelector
            provincias={provincias}
            inicial={ubicacionInicial}
            required
            nivelRequerido="provincia"
            error={state && !state.success ? state.fieldErrors?.provincia_id?.[0] : undefined}
          />

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

          <CarreraSelector
            carreras={carreras}
            defaultCarreraId={perfil?.carrera_id}
            defaultCarreraOtra={perfil?.carrera_otra}
            required
            carreraIdError={state && !state.success ? state.fieldErrors?.carrera_id?.[0] : undefined}
            carreraOtraError={state && !state.success ? state.fieldErrors?.carrera_otra?.[0] : undefined}
          />

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
