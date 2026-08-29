'use client'

import { useActionState, useTransition, useEffect, useRef, useState } from 'react'
import { Button, Input, Field, Alert, PromptDialog } from '@/components/ui'
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
  const [promoviendo, setPromoviendo] = useState(false)
  const [error, setError] = useState('')

  // El diálogo llega con el texto tal cual lo escribió el postulante y se puede
  // corregir antes de confirmar. Lo que se promueve entra al catálogo oficial y
  // lo ve todo el mundo: una falta de ortografía acá queda a la vista de todos
  // los postulantes, y sacarla después obliga a renombrar la carrera a mano.
  function handlePromover(nombreOficial: string) {
    setError('')
    startTransition(async () => {
      const res = await promoverCarreraOtra(nombre, nombreOficial)
      if (res.success) setPromoviendo(false)
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
          setPromoviendo(true)
        }}
        loading={isPending}
      >
        Promover a oficial
      </Button>

      {/* `key` remonta el diálogo en cada apertura: el campo tiene que arrancar
          con el nombre de esta fila, no con lo tipeado en la anterior. */}
      <PromptDialog
        key={`${nombre}-${promoviendo}`}
        open={promoviendo}
        onClose={() => setPromoviendo(false)}
        onSubmit={handlePromover}
        title="Promover a carrera oficial"
        label="Nombre que entra al catálogo"
        defaultValue={nombre}
        confirmLabel="Promover"
        loading={isPending}
        error={error}
      >
        <p className="text-[13.5px] leading-relaxed text-ink-soft">
          Revisá la ortografía antes de confirmar: este nombre pasa al catálogo oficial y queda
          disponible para todos. Los postulantes que lo habían escrito a mano —con tildes o sin
          ellas— quedan re-vinculados a la carrera del catálogo.
        </p>
      </PromptDialog>
    </>
  )
}

// ─── Filtro de fecha (sección B) ────────────────────────────────────────────

