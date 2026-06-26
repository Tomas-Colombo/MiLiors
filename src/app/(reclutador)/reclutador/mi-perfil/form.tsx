'use client'

import { useActionState } from 'react'
import { actualizarPerfilReclutador } from '@/modules/perfil/actions'
import { Button, Field, Input, Textarea, Alert } from '@/components/ui'
import type { ActionResult } from '@/lib/types/domain'

type Perfil = {
  nombre_reclutador: string
  empresa: {
    nombre_empresa: string
    descripcion: string | null
    link_url: string | null
  } | null
} | null

const initialState: ActionResult = { success: false, error: '' }

export function PerfilReclutadorForm({ perfil }: { perfil: Perfil }) {
  const [state, action, pending] = useActionState(actualizarPerfilReclutador, initialState)
  const fieldErrors = !state.success && state.fieldErrors ? state.fieldErrors : {}

  return (
    <form action={action} className="space-y-4">
      {state.success && (
        <Alert tone="success" title="¡Datos actualizados correctamente!" />
      )}

      {!state.success && state.error && !state.fieldErrors && (
        <Alert tone="error" title={state.error} />
      )}

      <Field
        label="Tu nombre"
        htmlFor="nombre_reclutador"
        required
        error={fieldErrors.nombre_reclutador?.[0]}
      >
        <Input
          id="nombre_reclutador"
          name="nombre_reclutador"
          placeholder="Ej: Juan Pérez"
          defaultValue={perfil?.nombre_reclutador ?? ''}
          status={fieldErrors.nombre_reclutador ? 'error' : 'default'}
        />
      </Field>

      <Field
        label="Nombre de la empresa"
        htmlFor="nombre_empresa"
        required
        error={fieldErrors.nombre_empresa?.[0]}
      >
        <Input
          id="nombre_empresa"
          name="nombre_empresa"
          placeholder="Ej: Acme Corp"
          defaultValue={perfil?.empresa?.nombre_empresa ?? ''}
          status={fieldErrors.nombre_empresa ? 'error' : 'default'}
        />
      </Field>

      <Field
        label="Descripción de la empresa"
        htmlFor="descripcion"
        hint="Breve descripción de la empresa (opcional)."
        error={fieldErrors.descripcion?.[0]}
      >
        <Textarea
          id="descripcion"
          name="descripcion"
          placeholder="A qué se dedica la empresa…"
          rows={3}
          defaultValue={perfil?.empresa?.descripcion ?? ''}
          status={fieldErrors.descripcion ? 'error' : 'default'}
        />
      </Field>

      <Field
        label="Sitio web"
        htmlFor="link_url"
        error={fieldErrors.link_url?.[0]}
      >
        <Input
          id="link_url"
          name="link_url"
          type="url"
          placeholder="https://ejemplo.com"
          defaultValue={perfil?.empresa?.link_url ?? ''}
          status={fieldErrors.link_url ? 'error' : 'default'}
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
