'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui'
import { desactivarPostulante } from '@/modules/admin/actions'

export function DesactivarPostulanteBtn({ id, activo }: { id: string; activo: boolean }) {
  const [isPending, startTransition] = useTransition()

  if (!activo) {
    return <span className="text-[12px] text-neutral-400">Inactivo</span>
  }

  function handleClick() {
    if (!confirm('¿Desactivar el perfil de este postulante? Dejará de aparecer en búsquedas.')) return
    startTransition(async () => {
      await desactivarPostulante(id)
    })
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleClick}
      loading={isPending}
    >
      Desactivar
    </Button>
  )
}
