'use client'

import { useState, useTransition } from 'react'
import { Switch } from '@/components/ui'
import { Alert } from '@/components/ui'
import { togglePerfilEnBusqueda } from './actions'

type Props = {
  initialValue: boolean
  /** Bloqueo de la administración (H-230): el postulante puede ocultarse, no activarse. */
  bloqueado: boolean
  /** Test con dominante e informe LISTO: sin esto la RLS no lo muestra aunque el switch esté activo. */
  cumpleRequisitos: boolean
}

export function VisibilityToggle({ initialValue, bloqueado, cumpleRequisitos }: Props) {
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

  // El switch refleja la elección del postulante; el texto, si de verdad aparece
  // en las búsquedas, que además depende del bloqueo y de los requisitos.
  let label: string
  let descripcion: string
  if (bloqueado) {
    label = activo ? 'Perfil pausado' : 'Perfil oculto en búsquedas'
    descripcion = 'Tu perfil fue pausado por la administración. Escribinos si creés que es un error.'
  } else if (!activo) {
    label = 'Perfil oculto en búsquedas'
    descripcion = 'No aparecés en las búsquedas de reclutadores. Solo verán tu perfil si postulaste a uno de sus puestos.'
  } else if (!cumpleRequisitos) {
    label = 'Visibilidad activada'
    descripcion = 'Vas a aparecer en las búsquedas cuando tu informe de personalidad esté listo.'
  } else {
    label = 'Perfil visible para reclutadores'
    descripcion = 'Los reclutadores pueden encontrarte. Tu email y teléfono son visibles.'
  }

  return (
    <div className="space-y-2">
      <Switch
        label={label}
        checked={activo}
        onCheckedChange={handleChange}
        // Bloqueado y oculto: activarlo lo rechazaría el servidor, así que no se ofrece.
        disabled={isPending || (bloqueado && !activo)}
      />
      <p className={bloqueado ? 'text-xs text-error-ink' : 'text-xs text-muted'}>{descripcion}</p>
      {error && <Alert tone="error" title={error} />}
    </div>
  )
}
