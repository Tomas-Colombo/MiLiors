'use client'

import { useTransition, useState } from 'react'
import { Button, IconButton, Modal, Alert, Tooltip } from '@/components/ui'
import { AlertTriangleIcon, TrashIcon } from '@/components/icons'
import { cerrarPuesto, reactivarPuesto, eliminarPuesto } from '@/modules/puestos/actions'

type Props = {
  puestoId: string
  activo: boolean
}

export function PuestoAcciones({ puestoId, activo }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)

  function handleCerrar() {
    setError(null)
    startTransition(async () => {
      const result = await cerrarPuesto(puestoId)
      if (!result.success) setError(result.error)
    })
  }

  function handleReactivar() {
    setError(null)
    startTransition(async () => {
      const result = await reactivarPuesto(puestoId)
      if (!result.success) setError(result.error)
    })
  }

  function handleEliminar() {
    setError(null)
    startTransition(async () => {
      const result = await eliminarPuesto(puestoId)
      if (!result.success) {
        setError(result.error)
        setConfirmarEliminar(false)
      }
      // Si success, el revalidatePath quita la fila de la lista
    })
  }

  return (
    <div className="flex flex-col gap-2 items-center">
      <div className="flex items-center gap-2">
        <a
          href={`/reclutador/postulaciones?puesto=${puestoId}`}
          className="inline-flex h-8 items-center rounded-[7px] border border-neutral-300 bg-surface px-3.5 text-[12.5px] font-semibold text-ink-soft hover:bg-neutral-50 whitespace-nowrap"
        >
          Ver postulaciones
        </a>
        <a
          href={`/reclutador/puestos/${puestoId}/editar`}
          className="inline-flex h-8 items-center rounded-[7px] border border-neutral-300 bg-surface px-3.5 text-[12.5px] font-semibold text-ink-soft hover:bg-neutral-50"
        >
          Editar
        </a>
        {activo ? (
          <Button variant="destructive" size="sm" className="min-w-[92px]" loading={isPending} onClick={handleCerrar}>
            Cerrar
          </Button>
        ) : (
          <Button variant="tonal" size="sm" className="min-w-[92px]" loading={isPending} onClick={handleReactivar}>
            Reactivar
          </Button>
        )}
        <Tooltip content="Eliminar puesto">
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Eliminar puesto"
            className="text-neutral-400 hover:bg-[#fceeed] hover:text-error"
            onClick={() => setConfirmarEliminar(true)}
            disabled={isPending}
          >
            <TrashIcon size={16} />
          </IconButton>
        </Tooltip>
      </div>
      {error && <Alert tone="error" title={error} className="text-xs" />}

      <Modal
        open={confirmarEliminar}
        onClose={() => !isPending && setConfirmarEliminar(false)}
        icon={
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fceeed] text-error">
            <AlertTriangleIcon size={22} strokeWidth={2} />
          </span>
        }
        title="¿Eliminar este puesto?"
        footer={
          <>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setConfirmarEliminar(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              loading={isPending}
              onClick={handleEliminar}
            >
              Eliminar
            </Button>
          </>
        }
      >
        <p>
          Si lo eliminás, el puesto <strong>desaparecerá de tu perfil</strong> y perderás
          el rastro de todas las postulaciones que se hayan hecho. Esta acción no se puede
          deshacer.
        </p>
        <p className="mt-2">
          Si solo querés dejar de recibir postulaciones sin perder el historial, usá la
          opción <strong>Cerrar</strong>.
        </p>
      </Modal>
    </div>
  )
}
