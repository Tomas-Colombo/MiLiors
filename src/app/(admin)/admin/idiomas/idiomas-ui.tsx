'use client'

import { useActionState, useTransition, useEffect, useRef } from 'react'
import { Button, Input, Field, Alert } from '@/components/ui'
import { PlusIcon } from '@/components/icons'
import { crearIdioma, desactivarIdioma, reactivarIdioma } from '@/modules/admin/actions'
import type { ActionResult } from '@/lib/types/domain'

// ─── Formulario crear idioma ──────────────────────────────────────────────────

const initialState: ActionResult = { success: false, error: '' }

export function CrearIdiomaForm() {
  const [state, action, pending] = useActionState(crearIdioma, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) formRef.current?.reset()
  }, [state])

  return (
    <div className="space-y-3">
      <form ref={formRef} action={action} className="flex items-end gap-3">
        <Field label="Nuevo idioma" htmlFor="nombre" className="flex-1">
          <Input
            id="nombre"
            name="nombre"
            placeholder="Ej: Inglés, Portugués, Francés…"
            required
            status={!state.success && state.error ? 'error' : 'default'}
          />
        </Field>
        <Button type="submit" size="md" loading={pending} leftIcon={<PlusIcon size={15} />}>
          Agregar
        </Button>
      </form>

      {state.success && <Alert tone="success" title="Idioma creado correctamente." />}
      {!state.success && state.error && <Alert tone="error" title={state.error} />}
    </div>
  )
}

// ─── Botones de acción por fila ───────────────────────────────────────────────

export function IdiomaAcciones({ id, activo }: { id: string; activo: boolean }) {
  const [isPending, startTransition] = useTransition()

  function handleDesactivar() {
    if (!confirm('¿Desactivar este idioma? Seguirá existiendo como baja lógica.')) return
    startTransition(async () => {
      await desactivarIdioma(id)
    })
  }

  function handleReactivar() {
    startTransition(async () => {
      await reactivarIdioma(id)
    })
  }

  if (activo) {
    return (
      <Button
        variant="secondary"
        size="sm"
        onClick={handleDesactivar}
        loading={isPending}
      >
        Desactivar
      </Button>
    )
  }

  return (
    <Button
      variant="tonal"
      size="sm"
      onClick={handleReactivar}
      loading={isPending}
    >
      Reactivar
    </Button>
  )
}
