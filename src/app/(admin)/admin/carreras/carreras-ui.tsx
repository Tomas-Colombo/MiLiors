'use client'

import { useActionState, useTransition, useEffect, useRef, useState } from 'react'
import { Button, Input, Field, Alert, ConfirmDialog } from '@/components/ui'
import { CatalogoAcciones } from '@/components/admin/catalogo-acciones'
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
  return (
    <CatalogoAcciones
      nombre={nombre}
      activo={activo}
      esta="esta carrera"
      etiquetaNombre="Nombre de la carrera"
      onRenombrar={(valor) => renombrarCarrera(id, valor)}
      onDesactivar={() => desactivarCarrera(id)}
      onReactivar={() => reactivarCarrera(id)}
      consecuencia={
        <>
          Es una baja lógica: no se borra nada y podés reactivarla cuando quieras. Deja de
          ofrecerse en el perfil de los postulantes; quienes ya la tienen cargada la conservan.
        </>
      }
    />
  )
}

// ─── Sección B: carreras cargadas por postulantes ("otras") ───────────────

export function PromoverCarreraOtraBoton({ nombre }: { nombre: string }) {
  const [isPending, startTransition] = useTransition()
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState('')

  function handleConfirmar() {
    setError('')
    startTransition(async () => {
      const res = await promoverCarreraOtra(nombre)
      if (res.success) setConfirmando(false)
      else setError(res.error || 'No se pudo promover la carrera.')
    })
  }

  return (
    <>
      <Button
        variant="tonal"
        size="sm"
        onClick={() => {
          setError('')
          setConfirmando(true)
        }}
        loading={isPending}
      >
        Promover a oficial
      </Button>

      <ConfirmDialog
        open={confirmando}
        onClose={() => setConfirmando(false)}
        onConfirm={handleConfirmar}
        title={`¿Promover “${nombre}” a carrera oficial?`}
        confirmLabel="Promover"
        loading={isPending}
        error={error}
      >
        Pasa al catálogo oficial y queda disponible para todos. Los postulantes que la habían
        escrito a mano quedan re-vinculados a la carrera del catálogo.
      </ConfirmDialog>
    </>
  )
}

// ─── Filtro de fecha (sección B) ────────────────────────────────────────────

