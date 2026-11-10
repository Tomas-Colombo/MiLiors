'use client'

import { useState, useTransition } from 'react'
import { Button, ConfirmDialog } from '@/components/ui'
import { desactivarPostulante, reactivarPostulante } from '@/modules/admin/actions'

export function DesactivarPostulanteBtn({ id, activo }: { id: string; activo: boolean }) {
  const [isPending, startTransition] = useTransition()
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleReactivar() {
    setError(null)
    startTransition(async () => {
      const res = await reactivarPostulante(id)
      if (!res.success && res.error) {
        setError(res.error)
      }
    })
  }

  function handleDesactivar() {
    setError(null)
    startTransition(async () => {
      const res = await desactivarPostulante(id)
      if (!res.success && res.error) {
        setError(res.error)
      } else {
        setConfirmando(false)
      }
    })
  }

  if (!activo) {
    return (
      <>
        <Button variant="tonal" size="sm" onClick={handleReactivar} loading={isPending}>
          Reactivar
        </Button>
        {error && <p className="text-xs text-error-ink mt-1">{error}</p>}
      </>
    )
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          setError(null)
          setConfirmando(true)
        }}
        loading={isPending}
      >
        Desactivar
      </Button>

      {error && <p className="text-xs text-error-ink mt-1">{error}</p>}

      <ConfirmDialog
        open={confirmando}
        onClose={() => {
          setError(null)
          setConfirmando(false)
        }}
        onConfirm={handleDesactivar}
        tone="destructive"
        title="¿Desactivar el perfil de este postulante?"
        confirmLabel="Desactivar"
        loading={isPending}
        error={error ?? undefined}
      >
        El perfil deja de aparecer en las búsquedas de los reclutadores. No se borra ningún dato
        y podés reactivarlo cuando quieras.
      </ConfirmDialog>
    </>
  )
}
