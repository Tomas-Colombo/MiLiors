'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Select } from '@/components/ui'
import { StarIcon, TrashIcon } from '@/components/icons'

type Puesto = { id: string; titulo_puesto: string; sinPostulaciones?: boolean }

type Props = {
  puestos: Puesto[]
  totalVisible: number
  totalTotal: number
}

export function FiltrosPostulaciones({ puestos, totalVisible, totalTotal }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      router.replace(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams],
  )

  const puestoOpts = [
    { value: '', label: 'Todos los puestos' },
    // Un puesto sin postulaciones (llegamos desde "Mis puestos") se muestra
    // seleccionado pero deshabilitado: el usuario sólo puede elegir puestos que
    // tengan postulaciones.
    ...puestos.map((p) => ({ value: p.id, label: p.titulo_puesto, disabled: p.sinPostulaciones })),
  ]

  const estadoOpts = [
    { value: '', label: 'Todos los estados' },
    { value: 'ENVIADA', label: 'No vistas' },
    { value: 'VISTO', label: 'Vistas' },
    { value: 'PROCESO_FINALIZADO', label: 'Descartadas' },
    { value: 'CERRADA', label: 'Cerradas' },
  ]

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <div className="w-full sm:w-56">
        <Select
          options={puestoOpts}
          value={searchParams.get('puesto') ?? ''}
          onChange={(e) => setParam('puesto', e.target.value)}
          aria-label="Filtrar por puesto"
        />
      </div>
      <div className="w-full sm:w-44">
        <Select
          options={estadoOpts}
          value={searchParams.get('estado') ?? ''}
          onChange={(e) => setParam('estado', e.target.value)}
          aria-label="Filtrar por estado"
        />
      </div>
      <button
        type="button"
        onClick={() => setParam('favoritos', searchParams.get('favoritos') === '1' ? '' : '1')}
        aria-pressed={searchParams.get('favoritos') === '1'}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 h-9 text-[12.5px] font-semibold whitespace-nowrap transition-colors ${
          searchParams.get('favoritos') === '1'
            ? 'bg-warning-bg text-warning-solid'
            : 'bg-neutral-100 text-muted hover:text-ink'
        }`}
      >
        <StarIcon
          size={14}
          className={
            searchParams.get('favoritos') === '1'
              ? 'fill-yellow-400 stroke-yellow-400'
              : 'stroke-current'
          }
        />
        Favoritos
      </button>
      {(searchParams.get('puesto') || searchParams.get('estado') || searchParams.get('favoritos')) && (
        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams()
            router.replace(`${pathname}?${params.toString()}`)
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-surface px-3 h-9 text-[12.5px] font-medium text-muted hover:bg-neutral-50 hover:text-ink hover:border-neutral-300 transition-colors whitespace-nowrap"
        >
          <TrashIcon size={14} />
          Limpiar filtros
        </button>
      )}
      {totalVisible !== totalTotal && (
        <span className="text-xs text-muted ml-auto">
          {totalVisible} de {totalTotal}
        </span>
      )}
    </div>
  )
}
