'use client'

import { useTransition, useState } from 'react'
import { Button, Alert } from '@/components/ui'
import { avanzarEstadoPostulacion } from '@/modules/postulaciones/actions'
import { ESTADO_POSTULACION } from '@/lib/constants/enums'

type Props = {
  postulacionId: string
  estadoActual: string
}

export function PostulacionAcciones({ postulacionId, estadoActual }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function advance(nuevoEstado: 'VISTO' | 'PROCESO_FINALIZADO') {
    setError(null)
    startTransition(async () => {
      const result = await avanzarEstadoPostulacion(postulacionId, nuevoEstado)
      if (!result.success) setError(result.error)
    })
  }

  const isClosed =
    estadoActual === ESTADO_POSTULACION.PROCESO_FINALIZADO ||
    estadoActual === ESTADO_POSTULACION.CERRADA

  return (
    <div className="flex flex-col gap-2 items-stretch w-full">
      {!isClosed && (
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          loading={isPending}
          onClick={() => advance('PROCESO_FINALIZADO')}
        >
          Descartar
        </Button>
      )}

      {error && <Alert tone="error" title={error} className="text-xs" />}
    </div>
  )
}
