'use client'

import { useActionState } from 'react'
import { Field, Input, Textarea, Button, Alert } from '@/components/ui'
import { crearEmpresaYAsociar } from '@/modules/empresas/actions'
import type { ActionResult } from '@/lib/types/domain'

const initialState: ActionResult = { success: false, error: '' }

export function OnboardingEmpresaForm() {
  const [state, action, isPending] = useActionState(crearEmpresaYAsociar, initialState)
  const fieldErrors = !state.success && state.fieldErrors ? state.fieldErrors : {}

  return (
    <form action={action} className="space-y-5">
      {!state.success && state.error && (
        <Alert tone="error" title={state.error} />
      )}

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
          status={fieldErrors.nombre_empresa ? 'error' : 'default'}
        />
      </Field>

      <Field
        label="Descripción"
        htmlFor="descripcion"
        error={fieldErrors.descripcion?.[0]}
        hint="Breve descripción de la empresa (opcional)."
      >
        <Textarea
          id="descripcion"
          name="descripcion"
          placeholder="A qué se dedica la empresa…"
          rows={3}
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
          status={fieldErrors.link_url ? 'error' : 'default'}
        />
      </Field>

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={isPending}>
          Guardar empresa y continuar
        </Button>
      </div>
    </form>
  )
}
