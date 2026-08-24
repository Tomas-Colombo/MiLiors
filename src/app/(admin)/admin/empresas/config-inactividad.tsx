'use client'

import { useActionState, useState } from 'react'
import { Card, Field, Input, Button, Alert } from '@/components/ui'
import { actualizarDiasInactividad } from '@/modules/admin/actions'
import type { ActionResult } from '@/lib/types/domain'

const initialState: ActionResult = { success: false, error: '' }

export function ConfigInactividad({ diasActual }: { diasActual: number }) {
  const [state, action, isPending] = useActionState(actualizarDiasInactividad, initialState)
  const [dias, setDias] = useState(String(diasActual))

  // "Modificado": el valor difiere del guardado. Mientras no cambie (o sea
  // inválido/vacío), el botón queda deshabilitado → gris. Al moverlo, se
  // habilita → violeta (gradiente de marca).
  const parsed = Number(dias)
  const sinCambios = dias.trim() === '' || !Number.isFinite(parsed) || parsed === diasActual

  return (
    <Card className="mb-6">
      <h2 className="text-[15px] font-bold text-ink">Pausa automática de puestos</h2>
      <p className="mt-1 text-[13px] text-muted">
        Los puestos activos sin actividad del reclutador (revisar postulaciones, cambiar
        estados, notas o editar el puesto) durante este período se pausan automáticamente.
      </p>

      <form action={action} className="mt-4 flex flex-wrap items-end gap-3">
        <Field label="Días de inactividad" htmlFor="dias" className="w-40">
          <Input
            id="dias"
            name="dias"
            type="number"
            min={1}
            max={3650}
            value={dias}
            onChange={(e) => setDias(e.target.value)}
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

      {!state.success && state.error && (
        <Alert tone="error" title={state.error} className="mt-3" />
      )}
    </Card>
  )
}
