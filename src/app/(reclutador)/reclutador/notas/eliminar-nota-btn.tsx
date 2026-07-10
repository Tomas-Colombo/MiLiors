'use client'

import { useState, useTransition } from 'react'
import { TrashIcon } from '@/components/icons'
import { eliminarNota } from '@/modules/postulantes/actions'

/**
 * Botón para eliminar una nota desde la lista global. Confirma antes de borrar
 * (acción irreversible) y delega en la server action `eliminarNota`, que
 * revalida `/reclutador/notas` para refrescar la lista.
 */
export function EliminarNotaBtn({
  notaId,
  postulanteId,
}: {
  notaId: string
  postulanteId: string
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState(false)

  function handleEliminar() {
    if (!confirm('¿Eliminar esta nota? Esta acción no se puede deshacer.')) return
    setError(false)
    startTransition(async () => {
      const result = await eliminarNota(notaId, postulanteId)
      if (!result.success) setError(true)
    })
  }

  return (
    <button
      type="button"
      onClick={handleEliminar}
      disabled={isPending}
      className="p-1.5 rounded-md text-muted hover:text-error hover:bg-error-bg transition-colors disabled:opacity-50"
      aria-label="Eliminar nota"
      title={error ? 'No se pudo eliminar. Reintentá.' : 'Eliminar nota'}
    >
      <TrashIcon size={14} />
    </button>
  )
}
