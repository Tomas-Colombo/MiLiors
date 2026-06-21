'use client'

import { useActionState, useTransition } from 'react'
import { Button, Input, Field, Alert } from '@/components/ui'
import { PlusIcon } from '@/components/icons'
import { crearCompetencia, desactivarCompetencia, reactivarCompetencia } from '@/modules/admin/actions'
import type { ActionResult } from '@/lib/types/domain'

// ─── Formulario crear competencia ─────────────────────────────────────────────

const initialState: ActionResult = { success: false, error: '' }

export function CrearCompetenciaForm() {
  const [state, action, pending] = useActionState(crearCompetencia, initialState)

  return (
    <form action={action} className="flex items-end gap-3">
      <Field label="Nueva competencia" htmlFor="nombre" className="flex-1">
        <Input
          id="nombre"
          name="nombre"
          placeholder="Ej: Liderazgo, Trabajo en equipo, Comunicación…"
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

export function CrearCompetenciaFeedback({ state }: { state: ActionResult | null }) {
  if (!state) return null
  if (state.success) return <Alert tone="success" title="Competencia creada correctamente." />
  if (state.error) return <Alert tone="error" title={state.error} />
  return null
}

// ─── Botones de acción por fila ───────────────────────────────────────────────

export function CompetenciaAcciones({ id, activa }: { id: string; activa: boolean }) {
  const [isPending, startTransition] = useTransition()

  function handleDesactivar() {
    if (!confirm('¿Desactivar esta competencia? Seguirá existiendo como baja lógica.')) return
    startTransition(async () => {
      await desactivarCompetencia(id)
    })
  }

  function handleReactivar() {
    startTransition(async () => {
      await reactivarCompetencia(id)
    })
  }

  if (activa) {
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
