'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Select } from '@/components/ui'

type Puesto = { id: string; titulo_puesto: string }

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
    ...puestos.map((p) => ({ value: p.id, label: p.titulo_puesto })),
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
      {(searchParams.get('puesto') || searchParams.get('estado')) && (
        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams()
            router.replace(`${pathname}?${params.toString()}`)
          }}
          className="text-xs text-muted hover:text-ink transition-colors whitespace-nowrap"
        >
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
