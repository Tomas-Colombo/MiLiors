'use client'

import { useActionState, useTransition, useEffect, useRef } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Button, Input, Field, Alert, DateInput } from '@/components/ui'
import { PlusIcon } from '@/components/icons'
import {
  crearCarrera,
  renombrarCarrera,
  desactivarCarrera,
  reactivarCarrera,
  promoverCarreraOtra,
} from '@/modules/admin/actions'
import type { ActionResult } from '@/lib/types/domain'

const initialState: ActionResult = { success: false, error: '' }

// ─── Sección A: carreras oficiales ─────────────────────────────────────────

export function CrearCarreraForm() {
  const [state, action, pending] = useActionState(crearCarrera, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) formRef.current?.reset()
  }, [state])

  return (
    <div className="space-y-3">
      <form ref={formRef} action={action} className="flex items-end gap-3">
        <Field label="Nueva carrera" htmlFor="nombre" className="flex-1">
          <Input
            id="nombre"
            name="nombre"
            placeholder="Ej: Ingeniería en Sistemas"
            required
            status={!state.success && state.error ? 'error' : 'default'}
          />
        </Field>
        <Button type="submit" size="md" loading={pending} leftIcon={<PlusIcon size={15} />}>
          Agregar
        </Button>
      </form>
      {state.success && <Alert tone="success" title="Carrera creada correctamente." />}
      {!state.success && state.error && <Alert tone="error" title={state.error} />}
    </div>
  )
}

export function CarreraAcciones({ id, nombre, activo }: { id: string; nombre: string; activo: boolean }) {
  const [isPending, startTransition] = useTransition()

  function handleEditar() {
    const nuevo = window.prompt('Nuevo nombre de la carrera:', nombre)
    if (nuevo == null || nuevo.trim() === '' || nuevo.trim() === nombre) return
    startTransition(async () => {
      const res = await renombrarCarrera(id, nuevo)
      if (!res.success) window.alert(res.error)
    })
  }

  function handleToggle() {
    if (activo && !window.confirm('¿Desactivar esta carrera? Seguirá existiendo como baja lógica.')) return
    startTransition(async () => {
      if (activo) await desactivarCarrera(id)
      else await reactivarCarrera(id)
    })
  }

  return (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" size="sm" onClick={handleEditar} loading={isPending}>
        Editar
      </Button>
      <Button variant={activo ? 'secondary' : 'tonal'} size="sm" onClick={handleToggle} loading={isPending}>
        {activo ? 'Desactivar' : 'Reactivar'}
      </Button>
    </div>
  )
}

// ─── Sección B: carreras cargadas por postulantes ("otras") ───────────────

export function PromoverCarreraOtraBoton({ nombre }: { nombre: string }) {
  const [isPending, startTransition] = useTransition()

  function handlePromover() {
    if (
      !window.confirm(
        `¿Promover "${nombre}" a carrera oficial? Se re-vincularán los postulantes que la cargaron.`,
      )
    )
      return
    startTransition(async () => {
      const res = await promoverCarreraOtra(nombre)
      if (!res.success) window.alert(res.error)
    })
  }

  return (
    <Button variant="tonal" size="sm" onClick={handlePromover} loading={isPending}>
      Promover a oficial
    </Button>
  )
}

// ─── Filtro de fecha (sección B) ────────────────────────────────────────────

export function FiltroFechaCarrerasOtras({ desde, hasta }: { desde: string; hasta: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div className="flex items-end gap-3">
      <Field label="Desde" className="w-40">
        <DateInput
          value={desde}
          max={hasta || undefined}
          onChange={(value) => setParam('desde', value)}
          aria-label="Desde"
        />
      </Field>
      <Field label="Hasta" className="w-40">
        <DateInput
          value={hasta}
          min={desde || undefined}
          onChange={(value) => setParam('hasta', value)}
          aria-label="Hasta"
        />
      </Field>
    </div>
  )
}
