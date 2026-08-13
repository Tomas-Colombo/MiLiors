'use client'

import { useActionState, useState } from 'react'
import { Card, Field, Input, Button, Alert } from '@/components/ui'
import { actualizarDiasReactivarFeedback } from '@/modules/admin/actions'
import type { ActionResult } from '@/lib/types/domain'

const initialState: ActionResult = { success: false, error: '' }

export function ConfigReactivacion({ diasActual }: { diasActual: number }) {
  const [state, action, isPending] = useActionState(actualizarDiasReactivarFeedback, initialState)
  const [dias, setDias] = useState(String(diasActual))

  const parsed = Number(dias)
  const sinCambios = dias.trim() === '' || !Number.isFinite(parsed) || parsed === diasActual

  return (
    <Card className="mb-6">
      <h2 className="text-[15px] font-bold text-ink">Reactivación del cuadro de opinión</h2>
      <p className="mt-1 text-[13px] text-muted">
        Cuando el postulante responde &ldquo;¿cuánto te representa este informe?&rdquo;, el cuadro se
        cierra y no vuelve a ofrecerse hasta que pase este período. Si regenera su informe se reabre
        antes: es un informe distinto.
      </p>

      <form action={action} className="mt-4 flex flex-wrap items-end gap-3">
        <Field label="Días hasta reactivar" htmlFor="dias-reactivar" className="w-44">
          <Input
            id="dias-reactivar"
            name="dias"
            type="number"
            min={1}
            max={3650}
            value={dias}
            onChange={e => setDias(e.target.value)}
            status={!state.success && state.error ? 'error' : 'default'}
          />
        </Field>
        <Button type="submit" loading={isPending} disabled={sinCambios}>
          Guardar
        </Button>
        {state.success && sinCambios && (
          <span className="pb-2.5 text-[13px] font-medium text-success">Guardado ✓</span>
        )}
      </form>

      {!state.success && state.error && <Alert tone="error" title={state.error} className="mt-3" />}
    </Card>
  )
}
