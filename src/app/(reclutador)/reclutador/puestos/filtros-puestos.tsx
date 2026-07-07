'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Select } from '@/components/ui'
import { TrashIcon } from '@/components/icons'
import { SearchInput } from '@/components/shared/list-controls'

type Props = {
  totalVisible: number
  totalTotal: number
}

export function FiltrosPuestos({ totalVisible, totalTotal }: Props) {
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
      params.delete('page')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    },
    [router, pathname, searchParams],
  )

  const ordenOpts = [
    { value: '', label: 'Más recientes' },
    { value: 'antiguos', label: 'Más antiguos' },
  ]

  const estadoOpts = [
    { value: '', label: 'Todos los estados' },
    { value: 'activo', label: 'Activos' },
    { value: 'cerrado', label: 'Cerrados' },
  ]

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <SearchInput placeholder="Buscar por título…" className="w-full sm:w-56" />
      <div className="w-full sm:w-44">
        <Select
          options={ordenOpts}
          value={searchParams.get('orden') ?? ''}
          onChange={(e) => setParam('orden', e.target.value)}
          aria-label="Ordenar por fecha"
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
      {(searchParams.get('q') || searchParams.get('orden') || searchParams.get('estado')) && (
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
