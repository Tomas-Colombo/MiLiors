'use client'

import { useActionState, useTransition } from 'react'
import { Button, Input, Field, Alert } from '@/components/ui'
import { PlusIcon } from '@/components/icons'
import { crearSector, desactivarSector, reactivarSector } from '@/modules/admin/actions'
import type { ActionResult } from '@/lib/types/domain'

// ─── Formulario crear sector ─────────────────────────────────────────────────

const initialState: ActionResult = { success: false, error: '' }

export function CrearSectorForm() {
  const [state, action, pending] = useActionState(crearSector, initialState)

  return (
    <form action={action} className="flex items-end gap-3">
      <Field label="Nuevo sector" htmlFor="nombre_sector" className="flex-1">
        <Input
          id="nombre_sector"
          name="nombre_sector"
          placeholder="Ej: Tecnología, Salud, Finanzas…"
          required
          status={state && !state.success && state.error ? 'error' : 'default'}
        />
      </Field>
      <Button type="submit" size="md" loading={pending} leftIcon={<PlusIcon size={15} />}>
        Agregar
      </Button>

      {state && !state.success && state.error && (
        <p className="sr-only" aria-live="polite">{state.error}</p>
      )}
    </form>
  )
}

// Error feedback separado del form (se muestra debajo)
export function CrearSectorFeedback({ state }: { state: ActionResult | null }) {
  if (!state) return null
  if (state.success) return <Alert tone="success" title="Sector creado correctamente." />
  if (state.error) return <Alert tone="error" title={state.error} />
  return null
}

// ─── Botones de acción por fila ───────────────────────────────────────────────

export function SectorAcciones({ id, activo }: { id: string; activo: boolean }) {
  const [isPending, startTransition] = useTransition()

  function handleDesactivar() {
    if (!confirm('¿Desactivar este sector? Seguirá existiendo como baja lógica.')) return
    startTransition(async () => {
      await desactivarSector(id)
    })
  }

  function handleReactivar() {
    startTransition(async () => {
      await reactivarSector(id)
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
