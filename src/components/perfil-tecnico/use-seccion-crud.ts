'use client'

import { useState, useTransition } from 'react'
import type { ActionResult } from '@/lib/types/domain'

/**
 * La máquina de estado de una sección del perfil técnico: qué fila se está
 * editando, si el panel de alta está abierto, y qué fila se está por borrar.
 *
 * Estaba escrita igual cuatro veces —formación, cursos, experiencia e
 * idiomas—, con la única diferencia de a qué server action llamaba.
 */
export function useSeccionCrud(eliminar: (id: string) => Promise<ActionResult>) {
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [errorBaja, setErrorBaja] = useState('')
  const [isPending, startTransition] = useTransition()

  function pedirConfirmacion(id: string) {
    setErrorBaja('')
    setConfirmId(id)
  }

  function cancelarConfirmacion() {
    setConfirmId(null)
    setErrorBaja('')
  }

  function confirmarEliminacion() {
    if (!confirmId) return
    setErrorBaja('')
    startTransition(async () => {
      const res = await eliminar(confirmId)
      // El diálogo se cierra recién si la acción salió bien; si falló queda
      // abierto con el motivo a la vista. Antes se cerraba siempre y el error
      // se perdía sin que el postulante se enterara de que su ítem seguía ahí.
      if (res.success) setConfirmId(null)
      else setErrorBaja(res.error || 'No se pudo eliminar. Volvé a intentarlo.')
    })
  }

  return {
    mostrarForm,
    abrirForm: () => setMostrarForm(true),
    cerrarForm: () => setMostrarForm(false),

    editando,
    editar: setEditando,
    cancelarEdicion: () => setEditando(null),

    confirmId,
    pedirConfirmacion,
    cancelarConfirmacion,
    confirmarEliminacion,
    errorBaja,

    isPending,
  }
}
