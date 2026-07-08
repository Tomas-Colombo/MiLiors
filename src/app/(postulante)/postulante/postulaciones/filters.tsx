'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback, useRef } from 'react'
import { Select } from '@/components/ui'
import { SearchIcon, TrashIcon } from '@/components/icons'
import { ESTADO_POSTULACION } from '@/lib/constants/enums'

const ESTADO_OPTS = [
  { value: '', label: 'Todos los estados' },
  { value: ESTADO_POSTULACION.ENVIADA, label: 'Enviada' },
  { value: ESTADO_POSTULACION.VISTO, label: 'Vista' },
  { value: ESTADO_POSTULACION.PROCESO_FINALIZADO, label: 'Descartada' },
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => setParam('q', val), 380)
    },
    [setParam],
  )

  const q = sp.get('q') ?? ''
  const estado = sp.get('estado') ?? ''
  const orden = sp.get('orden') === 'asc' ? 'asc' : 'desc'
  const hasFilters = !!(q || estado || orden === 'asc')

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <div className="relative w-full sm:w-56">
        <SearchIcon
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
        />
        <input
          type="search"
          key={q}
          defaultValue={q}
          onChange={handleSearch}
          placeholder="Buscar por título…"
          className="h-10 w-full rounded-md border border-neutral-300 bg-surface pl-9 pr-3.5 font-sans text-sm text-ink outline-none placeholder:text-neutral-400 transition-[border,box-shadow] focus:border-[1.5px] focus:border-primary-600 focus:ring-[3px] focus:ring-primary-50"
        />
      </div>
      <div className="w-full sm:w-44">
        <Select
          options={ESTADO_OPTS}
          value={estado}
          onChange={(e) => setParam('estado', e.target.value)}
          aria-label="Filtrar por estado"
        />
      </div>
      <div className="w-full sm:w-48">
        <Select
          options={ORDEN_OPTS}
          value={orden}
          onChange={(e) => setParam('orden', e.target.value === 'asc' ? 'asc' : '')}
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
