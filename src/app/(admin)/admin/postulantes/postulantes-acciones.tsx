'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui'
import { desactivarPostulante, reactivarPostulante } from '@/modules/admin/actions'

export function DesactivarPostulanteBtn({ id, activo }: { id: string; activo: boolean }) {
  const [isPending, startTransition] = useTransition()

  function handleDesactivar() {
    if (!confirm('¿Desactivar el perfil de este postulante? Dejará de aparecer en búsquedas.')) return
    startTransition(async () => {
      await desactivarPostulante(id)
    })
  }

  function handleReactivar() {
    startTransition(async () => {
      await reactivarPostulante(id)
    })
  }

  if (!activo) {
    return (
      <Button
        variant="tonal"
        size="sm"
        onClick={handleReactivar}
        loading={isPending}
      >
        Reactivar
      </Button>
    )
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleDesactivar}
      loading={isPending}
    >
      Desactivar
    </Button>
  )
}
