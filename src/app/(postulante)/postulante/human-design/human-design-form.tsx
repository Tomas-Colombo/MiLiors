'use client'

import { useActionState, useTransition } from 'react'
import { Field, Select, Alert, Button } from '@/components/ui'
import {
  TIPO_ENERGETICO_HD,
  AUTORIDAD_HD,
  PERFIL_HD,
  ESTRATEGIA_HD,
} from '@/lib/constants/enums'
import { guardarHumanDesign, eliminarHumanDesign } from '@/modules/human-design/actions'
import type { HumanDesignData } from '@/modules/human-design/queries'
import type { ActionResult } from '@/lib/types/domain'

const INITIAL_STATE: ActionResult = { success: false, error: '' }

const tipoEnergeticoOptions = TIPO_ENERGETICO_HD.map((v) => ({ value: v, label: v }))
const autoridadOptions = AUTORIDAD_HD.map((v) => ({ value: v, label: v }))
const perfilOptions = PERFIL_HD.map((v) => ({ value: v, label: v }))
const estrategiaOptions = ESTRATEGIA_HD.map((v) => ({ value: v, label: v }))

export function HumanDesignForm({ hd }: { hd: HumanDesignData | null }) {
  const [state, action, pending] = useActionState(guardarHumanDesign, INITIAL_STATE)
  const [isDeleting, startDeleteTransition] = useTransition()

  function handleEliminar() {
    if (!confirm('¿Eliminás tu carta de Human Design? Esta acción no se puede deshacer.')) return
    startDeleteTransition(async () => {
      await eliminarHumanDesign()
    })
  }

  return (
    <div className="space-y-5">
      <form action={action} className="space-y-4">
        <Field
          label="Tipo energético"
          required
          error={state.success === false && state.fieldErrors?.tipo_energetico?.[0]}
        >
          <Select
            name="tipo_energetico"
            options={tipoEnergeticoOptions}
            placeholder="Seleccioná"
            defaultValue={hd?.tipo_energetico ?? ''}
          />
        </Field>

        <Field
          label="Autoridad"
          required
          error={state.success === false && state.fieldErrors?.autoridad_hd?.[0]}
        >
          <Select
            name="autoridad_hd"
            options={autoridadOptions}
            placeholder="Seleccioná"
            defaultValue={hd?.autoridad_hd ?? ''}
          />
        </Field>

        <Field
          label="Perfil"
          required
          error={state.success === false && state.fieldErrors?.perfil_hd?.[0]}
        >
          <Select
            name="perfil_hd"
            options={perfilOptions}
            placeholder="Seleccioná"
            defaultValue={hd?.perfil_hd ?? ''}
          />
        </Field>

        <Field
          label="Estrategia"
          required
          error={state.success === false && state.fieldErrors?.estrategia_hd?.[0]}
        >
          <Select
            name="estrategia_hd"
            options={estrategiaOptions}
            placeholder="Seleccioná"
            defaultValue={hd?.estrategia_hd ?? ''}
          />
        </Field>

        {state.success === false && state.error && !state.fieldErrors && (
          <Alert tone="error">{state.error}</Alert>
        )}
        {state.success === true && (
          <Alert tone="success">Human Design guardado correctamente.</Alert>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? 'Guardando…' : hd ? 'Actualizar' : 'Guardar'}
        </Button>
      </form>

      {hd && (
        <div className="border-t border-neutral-100 pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleEliminar}
            disabled={isDeleting}
            className="text-error hover:bg-error-bg"
          >
            {isDeleting ? 'Eliminando…' : 'Eliminar Human Design'}
          </Button>
        </div>
      )}
    </div>
  )
}
