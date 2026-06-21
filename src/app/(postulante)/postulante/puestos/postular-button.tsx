'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui'
import { postularAPuesto } from '@/modules/postulaciones/actions'

type Props = {
  puestoId: string
  yaPostulo: boolean
}

export function PostularButton({ puestoId, yaPostulo }: Props) {
  const [isPending, startTransition] = useTransition()

  if (yaPostulo) {
    return (
      <Button variant="secondary" size="sm" disabled>
        Ya postulaste
      </Button>
    )
  }

  function handleClick() {
    startTransition(async () => {
      await postularAPuesto(puestoId)
    })
  }

  return (
    <Button
      variant="primary"
      size="sm"
      loading={isPending}
      onClick={handleClick}
    >
      Postularme
    </Button>
  )
}
