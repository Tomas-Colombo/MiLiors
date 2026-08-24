'use client'

import { useActionState, useEffect, useRef } from 'react'
import { Button, Input, Field, Alert } from '@/components/ui'
import { CatalogoAcciones } from '@/components/admin/catalogo-acciones'
import { PlusIcon } from '@/components/icons'
import {
  crearProvincia,
  renombrarProvincia,
  desactivarProvincia,
  reactivarProvincia,
  crearDepartamento,
  renombrarDepartamento,
  desactivarDepartamento,
  reactivarDepartamento,
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
  return (
    <CatalogoAcciones
      nombre={nombre}
      activo={activo}
      esta="esta provincia"
      etiquetaNombre="Nombre de la provincia"
      onRenombrar={(valor) => renombrarProvincia(id, valor)}
      onDesactivar={() => desactivarProvincia(id)}
      onReactivar={() => reactivarProvincia(id)}
      consecuencia={
        <>
          Es una baja lógica: no se borra nada y podés reactivarla cuando quieras. Deja de
        ofrecerse al elegir ubicación, junto con sus departamentos y localidades.
        </>
      }
    />
  )
}

// ─── Departamentos ────────────────────────────────────────────────────────────

export function CrearDepartamentoForm({ provinciaId }: { provinciaId: string }) {
  const [state, action, pending] = useActionState(crearDepartamento, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) formRef.current?.reset()
  }, [state])

  return (
    <div className="space-y-3">
      <form ref={formRef} action={action} className="flex items-end gap-3">
        <input type="hidden" name="provincia_id" value={provinciaId} />
        <Field label="Nuevo departamento" htmlFor="dep-nombre" className="flex-1">
          <Input id="dep-nombre" name="nombre" placeholder="Ej: Capital" required />
        </Field>
        <Button type="submit" size="md" loading={pending} leftIcon={<PlusIcon size={15} />}>
          Agregar
        </Button>
      </form>
      {state.success && <Alert tone="success" title="Departamento creado correctamente." />}
      {!state.success && state.error && <Alert tone="error" title={state.error} />}
    </div>
  )
}

export function DepartamentoAcciones({ id, nombre, activo }: { id: string; nombre: string; activo: boolean }) {
  return (
    <CatalogoAcciones
      nombre={nombre}
      activo={activo}
      esta="este departamento"
      etiquetaNombre="Nombre del departamento"
      onRenombrar={(valor) => renombrarDepartamento(id, valor)}
      onDesactivar={() => desactivarDepartamento(id)}
      onReactivar={() => reactivarDepartamento(id)}
      consecuencia={
        <>
          Es una baja lógica: no se borra nada y podés reactivarlo cuando quieras. Deja de
        ofrecerse al elegir ubicación, junto con sus localidades.
        </>
      }
    />
  )
}

// ─── Localidades ──────────────────────────────────────────────────────────────

export function CrearLocalidadForm({ departamentoId }: { departamentoId: string }) {
  const [state, action, pending] = useActionState(crearLocalidad, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) formRef.current?.reset()
  }, [state])

  return (
    <div className="space-y-3">
      <form ref={formRef} action={action} className="flex items-end gap-3">
        <input type="hidden" name="departamento_id" value={departamentoId} />
        <Field label="Nueva localidad" htmlFor="nombre" className="flex-1">
          <Input id="nombre" name="nombre" placeholder="Ej: San Martín" required />
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
  return (
    <CatalogoAcciones
      nombre={nombre}
      activo={activo}
      esta="esta localidad"
      etiquetaNombre="Nombre de la localidad"
      onRenombrar={(valor) => renombrarLocalidad(id, valor)}
      onDesactivar={() => desactivarLocalidad(id)}
      onReactivar={() => reactivarLocalidad(id)}
      consecuencia={
        <>
          Es una baja lógica: no se borra nada y podés reactivarla cuando quieras. Deja de
        ofrecerse al elegir ubicación; los perfiles y puestos que ya la tienen la conservan.
        </>
      }
    />
  )
}
