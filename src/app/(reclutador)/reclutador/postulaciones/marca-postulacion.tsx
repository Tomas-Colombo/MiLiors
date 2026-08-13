'use client'

import { useTransition, useState } from 'react'
import { Tooltip } from '@/components/ui'
import { CheckCircleIcon, HelpCircleIcon } from '@/components/icons'
import { marcarPostulacion } from '@/modules/postulaciones/actions'
import { MARCA_POSTULACION, type MarcaPostulacion } from '@/lib/constants/enums'

type Props = {
  postulacionId: string
  marca: MarcaPostulacion | null
}

const activo = {
  AVANZA: 'bg-success-solid text-white hover:brightness-95',
  DUDA: 'bg-warning-solid text-white hover:brightness-95',
}

const inactivo = {
  AVANZA: 'bg-success-bg text-success hover:bg-success-border',
  DUDA: 'bg-warning-bg text-warning hover:bg-warning-border',
}

export function MarcaPostulacionBtns({ postulacionId, marca: marcaInicial }: Props) {
  const [isPending, startTransition] = useTransition()
  const [marca, setMarca] = useState<MarcaPostulacion | null>(marcaInicial)

  function toggle(valor: MarcaPostulacion) {
    const anterior = marca
    const next = marca === valor ? null : valor
    setMarca(next) // optimistic
    startTransition(async () => {
      const result = await marcarPostulacion(postulacionId, next)
      if (!result.success) setMarca(anterior) // rollback
    })
  }

  const btn =
    'inline-flex w-full items-center justify-center gap-1.5 rounded-md px-2 h-8 ' +
    'text-[12.5px] font-semibold whitespace-nowrap transition-colors disabled:opacity-50'

  return (
    <div className="grid grid-cols-2 gap-2">
      <Tooltip
        className="w-full"
        content={
          <span className="block w-44 whitespace-normal leading-snug">
            {marca === MARCA_POSTULACION.AVANZA
              ? 'Quita la marca: el candidato deja de figurar como que avanza.'
              : 'Marca que el candidato avanza en el proceso. Aparece en el Asistente IA del puesto.'}
          </span>
        }
      >
        <button
          type="button"
          onClick={() => toggle(MARCA_POSTULACION.AVANZA)}
          disabled={isPending}
          aria-pressed={marca === MARCA_POSTULACION.AVANZA}
          className={`${btn} ${marca === MARCA_POSTULACION.AVANZA ? activo.AVANZA : inactivo.AVANZA}`}
        >
          <CheckCircleIcon size={14} />
          Avanzar
        </button>
      </Tooltip>

      <Tooltip
        className="w-full"
        content={
          <span className="block w-44 whitespace-normal leading-snug">
            {marca === MARCA_POSTULACION.DUDA
              ? 'Quita la marca de duda.'
              : 'Igual que Avanzar, pero el perfil queda señalado como que está en duda.'}
          </span>
        }
      >
        <button
          type="button"
          onClick={() => toggle(MARCA_POSTULACION.DUDA)}
          disabled={isPending}
          aria-pressed={marca === MARCA_POSTULACION.DUDA}
          className={`${btn} ${marca === MARCA_POSTULACION.DUDA ? activo.DUDA : inactivo.DUDA}`}
        >
          <HelpCircleIcon size={14} />
          Duda
        </button>
      </Tooltip>
    </div>
  )
}
