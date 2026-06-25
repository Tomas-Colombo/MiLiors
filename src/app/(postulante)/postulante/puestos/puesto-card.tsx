'use client'

import { useState } from 'react'
import { Card, Badge } from '@/components/ui'
import { ChevronDownIcon, CalendarIcon } from '@/components/icons'
import { UBICACION_LABEL, CARGA_HORARIA_LABEL } from '@/lib/constants/enums'
import type { PuestoItem } from '@/modules/puestos/queries'

type Props = {
  puesto: PuestoItem
  actions: React.ReactNode
}

export function PuestoCard({ puesto, actions }: Props) {
  const [expanded, setExpanded] = useState(false)
  const hasDesc = !!puesto.descripcion_texto

  return (
    <Card padding="md" className="flex flex-col gap-3 h-full">
      {/* Cabecera */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-bold text-ink leading-snug">
            {puesto.titulo_puesto}
          </h2>
          {puesto.nombre_empresa && (
            <p className="mt-0.5 text-[13px] text-muted">{puesto.nombre_empresa}</p>
          )}
        </div>
        <div className="flex-none">{actions}</div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        <Badge tone="neutral">
          {UBICACION_LABEL[puesto.ubicacion] ?? puesto.ubicacion}
        </Badge>
        <Badge tone="neutral">
          {CARGA_HORARIA_LABEL[puesto.carga_horaria] ?? puesto.carga_horaria}
        </Badge>
        {puesto.nombre_sector && (
          <Badge tone="neutral">{puesto.nombre_sector}</Badge>
        )}
        {puesto.nivel_experiencia && (
          <Badge tone="neutral">{puesto.nivel_experiencia}</Badge>
        )}
      </div>

      {/* Descripción */}
      {hasDesc && (
        <p
          className={[
            'text-[13px] text-ink-soft leading-relaxed',
            !expanded ? 'line-clamp-2' : '',
          ].join(' ')}
        >
          {puesto.descripcion_texto}
        </p>
      )}

      {/* Detalles extra al expandir */}
      {expanded && (puesto.idioma || puesto.nivel_experiencia) && (
        <div className="border-t border-neutral-100 pt-3 space-y-1 text-[12px] text-neutral-500">
          {puesto.idioma && (
            <p>
              <span className="font-semibold text-neutral-600">Idioma:</span>{' '}
              {puesto.idioma}
            </p>
          )}
        </div>
      )}

      {/* Pie */}
      <div className="mt-auto flex items-center justify-between pt-1">
        <span className="flex items-center gap-1.5 text-[11px] text-neutral-400">
          <CalendarIcon size={11} />
          {new Date(puesto.fecha_publicacion).toLocaleDateString('es-AR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
        {hasDesc && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1 text-[12px] font-semibold text-primary-600 hover:text-primary-700 transition-colors"
          >
            {expanded ? 'Ver menos' : 'Ver descripción'}
            <ChevronDownIcon
              size={13}
              className={['transition-transform duration-200', expanded ? 'rotate-180' : ''].join(
                ' '
              )}
            />
          </button>
        )}
      </div>
    </Card>
  )
}
