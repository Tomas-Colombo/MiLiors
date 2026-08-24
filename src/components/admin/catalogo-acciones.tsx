'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { Button, ConfirmDialog, PromptDialog } from '@/components/ui'
import type { ActionResult } from '@/lib/types/domain'

export interface CatalogoAccionesProps {
  /** Nombre actual. Precarga el campo de renombrado. */
  nombre: string
  activo: boolean
  /** Cómo se nombra la entidad en el título de la baja: "esta provincia". */
  esta: string
  /** Etiqueta del campo de renombrado: "Nombre de la provincia". */
  etiquetaNombre: string
  /** Qué deja de pasar al darla de baja, más allá de que sea lógica. */
  consecuencia: ReactNode
  onRenombrar: (nombre: string) => Promise<ActionResult>
  onDesactivar: () => Promise<ActionResult>
  onReactivar: () => Promise<ActionResult>
}

/**
 * Par de acciones (renombrar / dar de baja o alta) de una fila de catálogo
 * administrado: provincias, departamentos, localidades y carreras comparten
 * exactamente este comportamiento.
 *
 * Antes cada uno resolvía lo mismo con `window.prompt()` y `window.confirm()`,
 * más un `window.alert()` para el error. Además de no poder estilarse ni seguir
 * el tema, esos diálogos pierden el valor tipeado apenas la acción falla: el
 * `prompt` ya se cerró y hay que volver a escribir todo. Acá el diálogo queda
 * abierto con lo que se escribió y muestra el error adentro.
 */
export function CatalogoAcciones({
  nombre,
  activo,
  esta,
  etiquetaNombre,
  consecuencia,
  onRenombrar,
  onDesactivar,
  onReactivar,
}: CatalogoAccionesProps) {
  const [isPending, startTransition] = useTransition()
  const [renombrando, setRenombrando] = useState(false)
  const [confirmandoBaja, setConfirmandoBaja] = useState(false)
  const [error, setError] = useState('')

  function abrir(set: (v: boolean) => void) {
    setError('')
    set(true)
  }

  function handleRenombrar(valor: string) {
    if (valor === nombre) {
      setRenombrando(false)
      return
    }
    startTransition(async () => {
      const res = await onRenombrar(valor)
      if (res.success) setRenombrando(false)
      else setError(res.error || 'No se pudo cambiar el nombre.')
    })
  }

  function handleBaja() {
    startTransition(async () => {
      const res = await onDesactivar()
      if (res.success) setConfirmandoBaja(false)
      else setError(res.error || 'No se pudo desactivar.')
    })
  }

  function handleAlta() {
    startTransition(async () => {
      await onReactivar()
    })
  }

  return (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" size="sm" onClick={() => abrir(setRenombrando)} loading={isPending}>
        Editar
      </Button>

      {activo ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => abrir(setConfirmandoBaja)}
          loading={isPending}
        >
          Desactivar
        </Button>
      ) : (
        <Button variant="tonal" size="sm" onClick={handleAlta} loading={isPending}>
          Reactivar
        </Button>
      )}

      {/* `key` remonta el diálogo en cada apertura para que el campo arranque
          siempre con el nombre de esta fila y no con lo tipeado en la anterior. */}
      <PromptDialog
        key={`${nombre}-${renombrando}`}
        open={renombrando}
        onClose={() => setRenombrando(false)}
        onSubmit={handleRenombrar}
        title="Cambiar el nombre"
        label={etiquetaNombre}
        defaultValue={nombre}
        confirmLabel="Guardar"
        loading={isPending}
        error={error}
      />

      <ConfirmDialog
        open={confirmandoBaja}
        onClose={() => setConfirmandoBaja(false)}
        onConfirm={handleBaja}
        tone="destructive"
        title={`¿Desactivar ${esta}?`}
        confirmLabel="Desactivar"
        loading={isPending}
        error={error}
      >
        {consecuencia}
      </ConfirmDialog>
    </div>
  )
}
