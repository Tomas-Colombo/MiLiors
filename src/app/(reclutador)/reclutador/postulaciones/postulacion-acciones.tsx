'use client'

import { useTransition, useState } from 'react'
import { Button, Alert } from '@/components/ui'
import { StarIcon } from '@/components/icons'
import { avanzarEstadoPostulacion, toggleFavoritoPostulacion } from '@/modules/postulaciones/actions'
import { ESTADO_POSTULACION } from '@/lib/constants/enums'

type Props = {
  postulacionId: string
  estadoActual: string
  isFavorito: boolean
}

export function PostulacionAcciones({ postulacionId, estadoActual, isFavorito }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [favorito, setFavorito] = useState(isFavorito)

  function advance(nuevoEstado: 'VISTO' | 'PROCESO_FINALIZADO') {
    setError(null)
    startTransition(async () => {
      const result = await avanzarEstadoPostulacion(postulacionId, nuevoEstado)
      if (!result.success) setError(result.error)
    })
  }

  function toggleFavorito() {
    const next = !favorito
    setFavorito(next) // optimistic
    startTransition(async () => {
      const result = await toggleFavoritoPostulacion(postulacionId, next)
      if (!result.success) {
        setFavorito(!next) // rollback
        setError(result.error)
      }
    })
  }

  const isClosed =
    estadoActual === ESTADO_POSTULACION.PROCESO_FINALIZADO ||
    estadoActual === ESTADO_POSTULACION.CERRADA

  return (
    <div className="flex flex-col gap-2 items-end">
      <div className="flex gap-2 flex-wrap justify-end items-center">
        {/* Favorite toggle */}
        <button
          type="button"
          onClick={toggleFavorito}
          disabled={isPending}
          aria-label={favorito ? 'Quitar de favoritos' : 'Marcar como favorito'}
          title={favorito ? 'Quitar de favoritos' : 'Marcar como favorito'}
          className="inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors hover:bg-yellow-50 disabled:opacity-50"
        >
          <StarIcon
            size={16}
            className={
              favorito
                ? 'fill-yellow-400 stroke-yellow-400'
                : 'stroke-neutral-300 hover:stroke-yellow-400'
            }
          />
        </button>

        {!isClosed && (
          <>
            {estadoActual === ESTADO_POSTULACION.ENVIADA && (
              <Button
                variant="tonal"
                size="sm"
                loading={isPending}
                onClick={() => advance('VISTO')}
              >
                Marcar como visto
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              loading={isPending}
              onClick={() => advance('PROCESO_FINALIZADO')}
            >
              Descartar
            </Button>
          </>
        )}

        {isClosed && (
          <span className="text-xs text-neutral-400">Sin acciones disponibles</span>
        )}
      </div>
      {error && <Alert tone="error" title={error} className="text-xs" />}
    </div>
  )
}
