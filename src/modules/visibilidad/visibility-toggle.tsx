'use client'

import { useState, useTransition } from 'react'
import { Switch } from '@/components/ui'
import { Alert } from '@/components/ui'
import { togglePerfilEnBusqueda } from './actions'

type Props = {
  initialValue: boolean
}

export function VisibilityToggle({ initialValue }: Props) {
  const [activo, setActivo] = useState(initialValue)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleChange(val: boolean) {
    setActivo(val)
    setError(null)
    startTransition(async () => {
      const result = await togglePerfilEnBusqueda(val)
      if (!result.success) {
        setActivo(!val) // revert
        setError(result.error)
      }
    })
  }

  return (
    <div className="space-y-2">
      <Switch
        label={activo ? 'Perfil visible para reclutadores' : 'Perfil oculto en búsquedas'}
        checked={activo}
        onCheckedChange={handleChange}
        disabled={isPending}
      />
      <p className="text-xs text-muted">
        {activo
          ? 'Los reclutadores pueden encontrarte. Tu email y teléfono son visibles.'
          : 'No aparecés en las búsquedas de reclutadores. Solo verán tu perfil si postulaste a uno de sus puestos.'}
      </p>
      {error && <Alert tone="error" title={error} />}
    </div>
  )
}
