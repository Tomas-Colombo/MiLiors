'use client'

import { useState, useTransition } from 'react'
import { TrashIcon } from '@/components/icons'
import { ConfirmDialog } from '@/components/ui'
import { eliminarNota } from '@/modules/postulantes/actions'

/**
 * Botón para eliminar una nota desde la lista global. Confirma antes de borrar
 * (acción irreversible) y delega en la server action `eliminarNota`, que
 * revalida `/reclutador/notas` para refrescar la lista.
 *
 * Si la acción falla, el error se muestra dentro del propio diálogo en vez de
 * quedar escondido en el `title` del botón.
 */
export function EliminarNotaBtn({
  notaId,
  postulanteId,
}: {
  notaId: string
  postulanteId: string
}) {
  const [isPending, startTransition] = useTransition()
  const [confirmando, setConfirmando] = useState(false)
  const [error, setError] = useState('')

  function handleConfirmar() {
    setError('')
    startTransition(async () => {
      const result = await eliminarNota(notaId, postulanteId)
      if (result.success) setConfirmando(false)
      else setError(result.error || 'No se pudo eliminar la nota. Volvé a intentarlo.')
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        disabled={isPending}
        className="p-1.5 rounded-md text-muted hover:text-error hover:bg-error-bg transition-colors disabled:opacity-50"
        aria-label="Eliminar nota"
        title="Eliminar nota"
      >
        <TrashIcon size={14} />
      </button>

      <ConfirmDialog
        open={confirmando}
        onClose={() => setConfirmando(false)}
        onConfirm={handleConfirmar}
        tone="destructive"
        title="¿Eliminar esta nota?"
        confirmLabel="Eliminar"
        loading={isPending}
        error={error}
      >
        La nota se borra definitivamente. Esta acción no se puede deshacer.
      </ConfirmDialog>
    </>
  )
}
