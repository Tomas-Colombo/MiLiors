'use client'

import { useTransition, useState } from 'react'
import { Button } from '@/components/ui'
import { Alert } from '@/components/ui'
import { cerrarPuesto, reactivarPuesto } from '@/modules/puestos/actions'

type Props = {
  puestoId: string
  activo: boolean
}

export function PuestoAcciones({ puestoId, activo }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="flex flex-col gap-2 items-end">
      <div className="flex gap-2">
        <a
          href={`/reclutador/puestos/${puestoId}/editar`}
          className="inline-flex h-8 items-center rounded-[7px] border border-neutral-300 bg-surface px-3.5 text-[12.5px] font-semibold text-ink-soft hover:bg-neutral-50"
        >
          Editar
        </a>
        {activo ? (
          <Button variant="destructive" size="sm" loading={isPending} onClick={handleCerrar}>
            Cerrar
          </Button>
        ) : (
          <Button variant="tonal" size="sm" loading={isPending} onClick={handleReactivar}>
            Reactivar
          </Button>
        )}
      </div>
      {error && <Alert tone="error" title={error} className="text-xs" />}
    </div>
  )
}
