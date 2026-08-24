'use client'

import { useActionState, useTransition, useEffect, useRef, useState } from 'react'
import { Button, Input, Field, Alert, ConfirmDialog } from '@/components/ui'
import { PlusIcon } from '@/components/icons'
import { crearIdioma, desactivarIdioma, reactivarIdioma } from '@/modules/admin/actions'
import type { ActionResult } from '@/lib/types/domain'

// ─── Formulario crear idioma ──────────────────────────────────────────────────

const initialState: ActionResult = { success: false, error: '' }

export function CrearIdiomaForm() {
  const [state, action, pending] = useActionState(crearIdioma, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) formRef.current?.reset()
  }, [state])

  return (
    <div className="space-y-3">
      <form ref={formRef} action={action} className="flex items-end gap-3">
        <Field label="Nuevo idioma" htmlFor="nombre" className="flex-1">
          <Input
            id="nombre"
            name="nombre"
            placeholder="Ej: Inglés, Portugués, Francés…"
            required
            status={!state.success && state.error ? 'error' : 'default'}
          />
        </Field>
        <Button type="submit" size="md" loading={pending} leftIcon={<PlusIcon size={15} />}>
          Agregar
        </Button>
      </form>

      {state.success && <Alert tone="success" title="Idioma creado correctamente." />}
      {!state.success && state.error && <Alert tone="error" title={state.error} />}
    </div>
  )
}

// ─── Botones de acción por fila ───────────────────────────────────────────────

export function IdiomaAcciones({ id, activo }: { id: string; activo: boolean }) {
  const [isPending, startTransition] = useTransition()
  const [confirmando, setConfirmando] = useState(false)

  function handleReactivar() {
    startTransition(async () => {
      await reactivarIdioma(id)
    })
  }

  if (!activo) {
    return (
      <Button variant="tonal" size="sm" onClick={handleReactivar} loading={isPending}>
        Reactivar
      </Button>
    )
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setConfirmando(true)}
        loading={isPending}
      >
        Desactivar
      </Button>

      <ConfirmDialog
        open={confirmando}
        onClose={() => setConfirmando(false)}
        onConfirm={() =>
          startTransition(async () => {
            await desactivarIdioma(id)
            setConfirmando(false)
          })
        }
        tone="destructive"
        title="¿Desactivar este idioma?"
        confirmLabel="Desactivar"
        loading={isPending}
      >
        Es una baja lógica: no se borra nada y podés reactivarlo cuando quieras. Deja de
        ofrecerse en los formularios, y los perfiles que ya lo tienen cargado lo conservan.
      </ConfirmDialog>
    </>
  )
}
