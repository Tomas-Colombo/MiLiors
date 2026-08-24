'use client'

import { useActionState, useTransition, useEffect, useRef, useState } from 'react'
import { Button, Input, Field, Alert, ConfirmDialog } from '@/components/ui'
import { PlusIcon } from '@/components/icons'
import { crearSector, desactivarSector, reactivarSector } from '@/modules/admin/actions'
import type { ActionResult } from '@/lib/types/domain'

// ─── Formulario crear sector ─────────────────────────────────────────────────

const initialState: ActionResult = { success: false, error: '' }

export function CrearSectorForm() {
  const [state, action, pending] = useActionState(crearSector, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) formRef.current?.reset()
  }, [state])

  return (
    <div className="space-y-3">
      <form ref={formRef} action={action} className="flex items-end gap-3">
        <Field label="Nuevo sector" htmlFor="nombre_sector" className="flex-1">
          <Input
            id="nombre_sector"
            name="nombre_sector"
            placeholder="Ej: Tecnología, Salud, Finanzas…"
            required
            status={!state.success && state.error ? 'error' : 'default'}
          />
        </Field>
        <Button type="submit" size="md" loading={pending} leftIcon={<PlusIcon size={15} />}>
          Agregar
        </Button>
      </form>

      {state.success && <Alert tone="success" title="Sector creado correctamente." />}
      {!state.success && state.error && <Alert tone="error" title={state.error} />}
    </div>
  )
}

// ─── Botones de acción por fila ───────────────────────────────────────────────

export function SectorAcciones({ id, activo }: { id: string; activo: boolean }) {
  const [isPending, startTransition] = useTransition()
  const [confirmando, setConfirmando] = useState(false)

  function handleReactivar() {
    startTransition(async () => {
      await reactivarSector(id)
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
            await desactivarSector(id)
            setConfirmando(false)
          })
        }
        tone="destructive"
        title="¿Desactivar este sector?"
        confirmLabel="Desactivar"
        loading={isPending}
      >
        Es una baja lógica: no se borra nada y podés reactivarlo cuando quieras. Deja de
        ofrecerse al publicar puestos, y los puestos que ya lo tienen asignado lo conservan.
      </ConfirmDialog>
    </>
  )
}
