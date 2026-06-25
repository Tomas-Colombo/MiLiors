'use client'

import { useActionState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Field, Select, Alert, Button } from '@/components/ui'
import {
  TIPO_ENERGETICO_HD,
  ENERGY_TYPE_CLASSIFICATION_HD,
  AUTORIDAD_HD,
  PERFIL_HD,
  ESTRATEGIA_HD,
} from '@/lib/constants/enums'
import { guardarHumanDesign } from '@/modules/human-design/actions'
import type { HumanDesignData } from '@/modules/human-design/queries'
import type { ActionResult } from '@/lib/types/domain'

const INITIAL_STATE: ActionResult = { success: false, error: '' }

const tipoEnergeticoOptions = TIPO_ENERGETICO_HD.map((v) => ({ value: v, label: v }))
const energyClassOptions = ENERGY_TYPE_CLASSIFICATION_HD.map((v) => ({ value: v, label: v }))
const autoridadOptions = AUTORIDAD_HD.map((v) => ({ value: v, label: v }))
const perfilOptions = PERFIL_HD.map((v) => ({ value: v, label: v }))
const estrategiaOptions = ESTRATEGIA_HD.map((v) => ({ value: v, label: v }))

export function HumanDesignForm({ hd }: { hd: HumanDesignData | null }) {
  const router = useRouter()
  const [state, action, pending] = useActionState(guardarHumanDesign, INITIAL_STATE)

  useEffect(() => {
    if (state.success) {
      router.push('/postulante')
    }
  }, [state.success, router])

  return (
    <div className="space-y-5">
      {/* Aviso de seriedad */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm font-semibold text-amber-800">
          Completá esta sección con seriedad
        </p>
        <p className="mt-0.5 text-sm text-amber-700">
          Los datos de tu carta de Human Design forman parte de tu perfil de personalidad
          y pueden influir en cómo los reclutadores te evalúan. Una vez guardado,
          no podrás eliminar esta información.
        </p>
      </div>

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
          label="Subtipo / Categoría de energía"
          required
          error={state.success === false && state.fieldErrors?.energy_type_classification?.[0]}
        >
          <Select
            name="energy_type_classification"
            options={energyClassOptions}
            placeholder="Seleccioná"
            defaultValue={hd?.energy_type_classification ?? ''}
          />
        </Field>

        <Field
          label="Autoridad interna"
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

        <Button type="submit" disabled={pending}>
          {pending ? 'Guardando…' : hd ? 'Actualizar' : 'Guardar'}
        </Button>
      </form>
    </div>
  )
}
