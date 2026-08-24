'use client'

import { useState, useTransition } from 'react'
import { Button, ConfirmDialog } from '@/components/ui'
import { desactivarPostulante, reactivarPostulante } from '@/modules/admin/actions'

export function DesactivarPostulanteBtn({ id, activo }: { id: string; activo: boolean }) {
  const [isPending, startTransition] = useTransition()
  const [confirmando, setConfirmando] = useState(false)

  function handleReactivar() {
    startTransition(async () => {
      await reactivarPostulante(id)
    })
  }

  if (!activo) {
    return (
      <Button variant="tonal" size="sm" onClick={handleReactivar} loading={isPending}>
        Reactivar
      </Button>
    )
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setConfirmando(true)}
        loading={isPending}
      >
        Desactivar
      </Button>

      <ConfirmDialog
        open={confirmando}
        onClose={() => setConfirmando(false)}
        onConfirm={() =>
          startTransition(async () => {
            await desactivarPostulante(id)
            setConfirmando(false)
          })
        }
        tone="destructive"
        title="¿Desactivar el perfil de este postulante?"
        confirmLabel="Desactivar"
        loading={isPending}
      >
        El perfil deja de aparecer en las búsquedas de los reclutadores. No se borra ningún dato
        y podés reactivarlo cuando quieras.
      </ConfirmDialog>
    </>
  )
}
