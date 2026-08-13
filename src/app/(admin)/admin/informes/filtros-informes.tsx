'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { FancySelect } from '@/components/ui'
import { TrashIcon } from '@/components/icons'
import { SearchInput } from '@/components/shared/list-controls'

type Props = {
  totalVisible: number
  totalTotal: number
}

export function FiltrosInformes({ totalVisible, totalTotal }: Props) {
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
      // Cualquier cambio de filtro vuelve a la primera página
      params.delete('page')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    },
    [router, pathname, searchParams],
  )

  const limpiarFiltros = useCallback(() => {
    router.replace(pathname)
  }, [router, pathname])

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
      <SearchInput placeholder="Buscar por participante…" className="w-full sm:w-64" />
      <div className="w-full sm:w-56">
        <FancySelect
          options={ordenOpts}
          value={searchParams.get('orden') ?? ''}
          onChange={(value) => setParam('orden', value)}
          aria-label="Ordenar informes"
        />
      </div>
      <div className="w-full sm:w-44">
        <FancySelect
          options={estadoOpts}
          value={searchParams.get('estado') ?? ''}
          onChange={(value) => setParam('estado', value)}
          aria-label="Filtrar por estado"
        />
      </div>
      {hayFiltros && (
        <button
          type="button"
          onClick={limpiarFiltros}
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
