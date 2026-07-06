'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useRef } from 'react'
import { Select, Input } from '@/components/ui'
import { SearchIcon, TrashIcon } from '@/components/icons'

type Props = {
  totalVisible: number
  totalTotal: number
}

export function FiltrosInformes({ totalVisible, totalTotal }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Búsqueda de texto con debounce para no navegar en cada tecla
  const setBusqueda = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => setParam('q', value.trim()), 300)
    },
    [setParam],
  )

  const ordenOpts = [
    { value: '', label: 'Actualización: más reciente' },
    { value: 'actualizacion_asc', label: 'Actualización: más antigua' },
    { value: 'generado_desc', label: 'Generación: más reciente' },
    { value: 'generado_asc', label: 'Generación: más antigua' },
    { value: 'participante_az', label: 'Participante (A–Z)' },
    { value: 'participante_za', label: 'Participante (Z–A)' },
  ]

  const estadoOpts = [
    { value: '', label: 'Todos los estados' },
    { value: 'LISTO', label: 'Listos' },
    { value: 'PENDIENTE', label: 'Pendientes' },
    { value: 'ERROR', label: 'En error' },
  ]

  const hayFiltros = !!(searchParams.get('q') || searchParams.get('orden') || searchParams.get('estado'))

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <div className="w-full sm:w-64">
        <Input
          leftIcon={<SearchIcon size={15} />}
          placeholder="Buscar por participante…"
          defaultValue={searchParams.get('q') ?? ''}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar por participante"
        />
      </div>
      <div className="w-full sm:w-56">
        <Select
          options={ordenOpts}
          value={searchParams.get('orden') ?? ''}
          onChange={(e) => setParam('orden', e.target.value)}
          aria-label="Ordenar informes"
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
      {hayFiltros && (
        <button
          type="button"
          onClick={() => router.replace(pathname)}
          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-surface px-3 h-9 text-[12.5px] font-medium text-muted hover:bg-neutral-50 hover:text-ink hover:border-neutral-300 transition-colors whitespace-nowrap"
        >
          <TrashIcon size={14} />
          Limpiar filtros
        </button>
      )}
      {totalVisible !== totalTotal && (
        <span className="text-xs text-muted ml-auto whitespace-nowrap">
          {totalVisible} de {totalTotal}
        </span>
      )}
    </div>
  )
}
