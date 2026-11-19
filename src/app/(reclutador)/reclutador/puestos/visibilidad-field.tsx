'use client'

import { useId } from 'react'
import { Alert, Field } from '@/components/ui'
import { GlobeIcon, LockIcon } from '@/components/icons'
import { VISIBILIDAD_PUESTO, type VisibilidadPuesto } from '@/lib/constants/enums'
import { cn } from '@/lib/utils'

const OPCIONES: {
  value: VisibilidadPuesto
  titulo: string
  descripcion: string
  icono: typeof GlobeIcon
}[] = [
  {
    value: VISIBILIDAD_PUESTO.PUBLICA,
    titulo: 'Público',
    descripcion: 'Aparece en el buscador de Miliors y cualquiera con el link puede verlo.',
    icono: GlobeIcon,
  },
  {
    value: VISIBILIDAD_PUESTO.PRIVADA,
    titulo: 'Privado',
    descripcion:
      'No aparece en el buscador. Solo lo ven quienes reciban el link. Ideal para búsquedas internas o candidatos que elijas.',
    icono: LockIcon,
  },
]

type Props = {
  value: VisibilidadPuesto
  onChange: (value: VisibilidadPuesto) => void
  /** Aviso al pasar a Privado un puesto que ya estaba publicado (sólo en edición). */
  avisarAlPasarAPrivado?: boolean
  error?: string
}

/**
 * Selector de visibilidad del puesto: dos tarjetas de radio. Es un campo
 * controlado (el form padre conserva el valor si el guardado falla) y envía
 * `visibilidad` con el FormData por los radios nativos.
 */
export function VisibilidadField({ value, onChange, avisarAlPasarAPrivado = false, error }: Props) {
  const grupoId = useId()

  return (
    <div className="space-y-3">
      <Field label="¿Quién puede ver este puesto?" required error={error}>
        <div role="radiogroup" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {OPCIONES.map((op) => {
            const Icono = op.icono
            const seleccionada = value === op.value
            return (
              <label
                key={op.value}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors',
                  'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary-600',
                  seleccionada
                    ? 'border-primary-600 bg-primary-tint'
                    : 'border-line bg-surface hover:border-neutral-300',
                )}
              >
                <input
                  type="radio"
                  name="visibilidad"
                  value={op.value}
                  checked={seleccionada}
                  onChange={() => onChange(op.value)}
                  aria-describedby={`${grupoId}-${op.value}`}
                  className="sr-only"
                />
                <span
                  className={cn(
                    'flex h-9 w-9 flex-none items-center justify-center rounded-lg',
                    seleccionada ? 'bg-primary-solid text-white' : 'bg-neutral-100 text-muted',
                  )}
                >
                  <Icono size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-compact font-semibold text-ink">{op.titulo}</span>
                  <span id={`${grupoId}-${op.value}`} className="block text-xs text-muted">
                    {op.descripcion}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
      </Field>

      {avisarAlPasarAPrivado && value === VISIBILIDAD_PUESTO.PRIVADA && (
        <Alert tone="warning">
          El puesto dejará de aparecer en el buscador. Quienes ya se postularon lo siguen viendo.
        </Alert>
      )}
    </div>
  )
}
