'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { FancySelect } from '@/components/ui'
import { TrashIcon } from '@/components/icons'
import { SearchInput } from '@/components/shared/list-controls'
import { ESTADO_POSTULACION } from '@/lib/constants/enums'

const ESTADO_OPTS = [
  { value: '', label: 'Todos los estados' },
  { value: ESTADO_POSTULACION.ENVIADA, label: 'Enviada' },
  { value: ESTADO_POSTULACION.VISTO, label: 'Vista' },
  { value: ESTADO_POSTULACION.PROCESO_FINALIZADO, label: 'No avanza' },
  { value: ESTADO_POSTULACION.CERRADA, label: 'Cerrada' },
]

const ORDEN_OPTS = [
  { value: 'desc', label: 'Más nuevas primero' },
  { value: 'asc', label: 'Más viejas primero' },
]

export function PostulacionesFilters() {
  const sp = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(sp.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      params.delete('page')
      router.replace(`${pathname}?${params.toString()}`)
    },
    [router, pathname, sp],
  )

  const q = sp.get('q') ?? ''
  const estado = sp.get('estado') ?? ''
  const orden = sp.get('orden') === 'asc' ? 'asc' : 'desc'
  const hasFilters = !!(q || estado || orden === 'asc')

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <SearchInput placeholder="Buscar por título…" className="w-full sm:w-56" />
      <div className="w-full sm:w-44">
        <FancySelect
          options={ESTADO_OPTS}
          value={estado}
          onChange={(value) => setParam('estado', value)}
          aria-label="Filtrar por estado"
        />
      </div>
      <div className="w-full sm:w-48">
        <FancySelect
          options={ORDEN_OPTS}
          value={orden}
          onChange={(value) => setParam('orden', value === 'asc' ? 'asc' : '')}
          aria-label="Ordenar por fecha"
        />
      </div>
      {hasFilters && (
        <button
          type="button"
          onClick={() => router.replace(pathname)}
          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-surface px-3 h-9 text-[12.5px] font-medium text-muted hover:bg-neutral-50 hover:text-ink hover:border-neutral-300 transition-colors whitespace-nowrap"
        >
          <TrashIcon size={14} />
          Limpiar filtros
        </button>
      )}
    </div>
  )
}
