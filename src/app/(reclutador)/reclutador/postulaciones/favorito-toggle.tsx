'use client'

import { useTransition, useState } from 'react'
import { StarIcon } from '@/components/icons'
import { toggleFavoritoPostulacion } from '@/modules/postulaciones/actions'

type Props = {
  postulacionId: string
  isFavorito: boolean
}

export function FavoritoToggle({ postulacionId, isFavorito }: Props) {
  const [isPending, startTransition] = useTransition()
  const [favorito, setFavorito] = useState(isFavorito)

  function toggleFavorito() {
    const next = !favorito
    setFavorito(next) // optimistic
    startTransition(async () => {
      const result = await toggleFavoritoPostulacion(postulacionId, next)
      if (!result.success) setFavorito(!next) // rollback
    })
  }

  return (
    <button
      type="button"
      onClick={toggleFavorito}
      disabled={isPending}
      aria-label={favorito ? 'Quitar de favoritos' : 'Marcar como favorito'}
      title={favorito ? 'Quitar de favoritos' : 'Marcar como favorito'}
      className="inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors hover:bg-yellow-50 disabled:opacity-50"
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
  )
}
