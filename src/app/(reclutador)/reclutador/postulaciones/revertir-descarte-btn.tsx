'use client'

import { useTransition } from 'react'
import { Undo2Icon } from '@/components/icons'
import { Tooltip } from '@/components/ui'
import { revertirDescarte } from '@/modules/postulaciones/actions'

type Props = {
  postulacionId: string
}

export function RevertirDescarteBtn({ postulacionId }: Props) {
  const [isPending, startTransition] = useTransition()

  function revertir() {
    startTransition(async () => {
      await revertirDescarte(postulacionId)
    })
  }

  return (
    <Tooltip content="Revertir descarte">
      <button
        type="button"
        onClick={revertir}
        disabled={isPending}
        aria-label="Revertir descarte"
        className="inline-flex items-center justify-center w-6 h-6 rounded-md text-neutral-300 hover:text-primary-600 hover:bg-primary-tint transition-colors disabled:opacity-50"
      >
        <Undo2Icon size={13} />
      </button>
    </Tooltip>
  )
}
