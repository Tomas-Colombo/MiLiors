'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
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
  const [showConfirm, setShowConfirm] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const confirmedRef = useRef(false)

  const isLocked = (hd?.veces_guardado ?? 0) >= 2
  const isUpdate = hd !== null

  useEffect(() => {
    if (state.success) {
      router.push('/postulante')
    }
  }, [state.success, router])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (isUpdate && !confirmedRef.current) {
      e.preventDefault()
      setShowConfirm(true)
    }
    confirmedRef.current = false
  }

  function handleConfirm() {
    confirmedRef.current = true
    setShowConfirm(false)
    formRef.current?.requestSubmit()
  }

  // Bloqueado: ya usó la única actualización permitida
  if (isLocked) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-4">
        <p className="text-sm font-semibold text-neutral-700">Human Design guardado permanentemente</p>
        <p className="mt-1 text-sm text-neutral-500">
          Ya utilizaste la actualización permitida. Los datos de Human Design son permanentes y no pueden modificarse nuevamente.
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Modal de confirmación para actualización */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-ink">¿Confirmar actualización?</h3>
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
              <p className="text-sm font-semibold text-amber-800">Esta es tu única actualización disponible</p>
              <p className="mt-1 text-sm text-amber-700">
                El Human Design es un dato permanente que no cambia a lo largo de tu vida.
                Solo podés modificarlo esta vez para corregir un error.
                Una vez confirmado, los datos quedarán fijos definitivamente.
              </p>
            </div>
            <div className="mt-4 flex gap-3">
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => setShowConfirm(false)}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" className="flex-1" onClick={handleConfirm}>
                Sí, actualizar
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {/* Aviso adaptado al estado: primera vez vs. actualización */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800">
            {isUpdate ? '⚠ Última actualización disponible' : 'Completá esta sección con seriedad'}
          </p>
          <p className="mt-0.5 text-sm text-amber-700">
            {isUpdate
              ? 'Solo podés modificar el Human Design una vez para corregir errores. Después de esta actualización, los datos quedarán fijos de forma permanente.'
              : 'Los datos de tu carta de Human Design forman parte de tu perfil de personalidad. Son datos permanentes — solo podrás modificarlos una vez después de guardarlos.'}
          </p>
        </div>

        <form ref={formRef} action={action} onSubmit={handleSubmit} className="space-y-4">
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
    </>
  )
}
