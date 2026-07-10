'use client'

import { useActionState, useTransition, useEffect, useRef } from 'react'
import { Button, Input, Field, Alert } from '@/components/ui'
import { PlusIcon } from '@/components/icons'
import {
  crearProvincia,
  renombrarProvincia,
  desactivarProvincia,
  reactivarProvincia,
  crearLocalidad,
  renombrarLocalidad,
  desactivarLocalidad,
  reactivarLocalidad,
} from '@/modules/admin/actions'
import type { ActionResult } from '@/lib/types/domain'

const initialState: ActionResult = { success: false, error: '' }

// ─── Provincias ───────────────────────────────────────────────────────────────

export function CrearProvinciaForm() {
  const [state, action, pending] = useActionState(crearProvincia, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) formRef.current?.reset()
  }, [state])

  return (
    <div className="space-y-3">
      <form ref={formRef} action={action} className="flex items-end gap-3">
        <Field label="Nueva provincia" htmlFor="nombre" className="flex-1">
          <Input
            id="nombre"
            name="nombre"
            placeholder="Ej: Tierra del Fuego"
            required
            status={!state.success && state.error ? 'error' : 'default'}
          />
        </Field>
        <Button type="submit" size="md" loading={pending} leftIcon={<PlusIcon size={15} />}>
          Agregar
        </Button>
      </form>
      {state.success && <Alert tone="success" title="Provincia creada correctamente." />}
      {!state.success && state.error && <Alert tone="error" title={state.error} />}
    </div>
  )
}

export function ProvinciaAcciones({ id, nombre, activo }: { id: string; nombre: string; activo: boolean }) {
  const [isPending, startTransition] = useTransition()

  function handleEditar() {
    const nuevo = window.prompt('Nuevo nombre de la provincia:', nombre)
    if (nuevo == null || nuevo.trim() === '' || nuevo.trim() === nombre) return
    startTransition(async () => {
      const res = await renombrarProvincia(id, nuevo)
      if (!res.success) window.alert(res.error)
    })
  }

  function handleToggle() {
    if (activo && !window.confirm('¿Desactivar esta provincia? Seguirá existiendo como baja lógica.')) return
    startTransition(async () => {
      if (activo) await desactivarProvincia(id)
      else await reactivarProvincia(id)
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

// ─── Localidades ──────────────────────────────────────────────────────────────

export function CrearLocalidadForm({ provinciaId }: { provinciaId: string }) {
  const [state, action, pending] = useActionState(crearLocalidad, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) formRef.current?.reset()
  }, [state])

  return (
    <div className="space-y-3">
      <form ref={formRef} action={action} className="flex items-end gap-3">
        <input type="hidden" name="provincia_id" value={provinciaId} />
        <Field label="Nueva localidad" htmlFor="nombre" className="flex-1">
          <Input id="nombre" name="nombre" placeholder="Ej: San Martín" required />
        </Field>
        <Field label="Departamento (opcional)" htmlFor="departamento" className="flex-1">
          <Input id="departamento" name="departamento" placeholder="Ej: Capital" />
        </Field>
        <Button type="submit" size="md" loading={pending} leftIcon={<PlusIcon size={15} />}>
          Agregar
        </Button>
      </form>
      {state.success && <Alert tone="success" title="Localidad creada correctamente." />}
      {!state.success && state.error && <Alert tone="error" title={state.error} />}
    </div>
  )
}

export function LocalidadAcciones({ id, nombre, activo }: { id: string; nombre: string; activo: boolean }) {
  const [isPending, startTransition] = useTransition()

  function handleEditar() {
    const nuevo = window.prompt('Nuevo nombre de la localidad:', nombre)
    if (nuevo == null || nuevo.trim() === '' || nuevo.trim() === nombre) return
    startTransition(async () => {
      const res = await renombrarLocalidad(id, nuevo)
      if (!res.success) window.alert(res.error)
    })
  }

  function handleToggle() {
    if (activo && !window.confirm('¿Desactivar esta localidad? Seguirá existiendo como baja lógica.')) return
    startTransition(async () => {
      if (activo) await desactivarLocalidad(id)
      else await reactivarLocalidad(id)
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
