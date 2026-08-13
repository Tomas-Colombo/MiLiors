'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { EyeIcon } from '@/components/icons'
import { Tooltip } from '@/components/ui'
import { avanzarEstadoPostulacion } from '@/modules/postulaciones/actions'
import { ESTADO_POSTULACION } from '@/lib/constants/enums'

type Props = {
  postulacionId: string
  postulanteId: string
  estadoActual: string
}

export function VerPerfilBtn({ postulacionId, postulanteId, estadoActual }: Props) {
  const [isPending, startTransition] = useTransition()

  function marcarVisto() {
    startTransition(async () => {
      await avanzarEstadoPostulacion(postulacionId, 'VISTO')
    })
  }

  return (
    <div className="flex items-center gap-1.5">
      <Tooltip
        className="flex-1"
        content={
          <span className="block w-44 whitespace-normal leading-snug">
            Abre el perfil completo del candidato y sus respuestas.
          </span>
        }
      >
        <Link
          href={`/reclutador/postulantes/${postulanteId}?postulacion=${postulacionId}&from=postulaciones`}
          className="w-full inline-flex items-center justify-center gap-1.5 rounded-md bg-primary-tint px-3 h-8 text-[12.5px] font-semibold text-primary-600 hover:bg-primary-tint-hover transition-colors whitespace-nowrap"
        >
          Ver perfil
        </Link>
      </Tooltip>
      {estadoActual === ESTADO_POSTULACION.ENVIADA && (
        <Tooltip
          content={
            <span className="block w-44 whitespace-normal leading-snug">
              Marca la postulación como vista sin abrir el perfil.
            </span>
          }
        >
          <button
            type="button"
            onClick={marcarVisto}
            disabled={isPending}
            aria-label="Marcar como visto"
            className="inline-flex items-center justify-center w-8 h-8 flex-none rounded-md bg-primary-tint text-primary-600 hover:bg-primary-tint-hover transition-colors disabled:opacity-50"
          >
            <EyeIcon size={15} />
          </button>
        </Tooltip>
      )}
    </div>
  )
}
