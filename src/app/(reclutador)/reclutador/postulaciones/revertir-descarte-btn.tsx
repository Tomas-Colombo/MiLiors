'use client'

import { useState, useTransition } from 'react'
import { Undo2Icon } from '@/components/icons'
import { Tooltip } from '@/components/ui'
import { revertirDescarte } from '@/modules/postulaciones/actions'

type Props = {
  postulacionId: string
}

export function RevertirDescarteBtn({ postulacionId }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function revertir() {
    setError(null)
    startTransition(async () => {
      const result = await revertirDescarte(postulacionId)
      if (!result.success && result.error) {
        setError(result.error)
      }
    })
  }

  return (
    <>
      <Tooltip
        content={
          <span className="block w-44 whitespace-normal leading-snug">
            Deshace el &quot;No avanzar&quot;: la postulación vuelve al estado Evaluada.
          </span>
        }
      >
        <button
          type="button"
          onClick={revertir}
          disabled={isPending}
          aria-label="Revertir: volver a poner en proceso"
          className="inline-flex items-center justify-center w-6 h-6 rounded-md text-neutral-300 hover:text-primary-600 hover:bg-primary-tint transition-colors disabled:opacity-50"
        >
          <Undo2Icon size={13} />
        </button>
      </Tooltip>
      {error && (
        <p role="alert" className="text-2xs text-error-ink">
          {error}
        </p>
      )}
    </>
  )
}
