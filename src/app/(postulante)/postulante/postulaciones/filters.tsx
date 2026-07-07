'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import { SearchIcon, FilterIcon } from '@/components/icons'
import { ESTADO_POSTULACION } from '@/lib/constants/enums'

const ESTADO_OPTIONS = [
  { label: 'Enviada', value: ESTADO_POSTULACION.ENVIADA },
  { label: 'Vista', value: ESTADO_POSTULACION.VISTO },
  { label: 'Descartada', value: ESTADO_POSTULACION.PROCESO_FINALIZADO },
  { label: 'Cerrada', value: ESTADO_POSTULACION.CERRADA },
]

function pill(active: boolean) {
  return [
    'rounded-full px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer select-none',
    active
      ? 'bg-primary-600 text-white shadow-sm'
      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
  ].join(' ')
}

export function PostulacionesFilters() {
  const sp = useSearchParams()
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  function update(key: string, value: string) {
    const params = new URLSearchParams(sp.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    router.replace(`/postulante/postulaciones?${params.toString()}`)
  }

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => update('q', val), 380)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sp]
  )

  const q = sp.get('q') ?? ''
  const estado = sp.get('estado') ?? ''
  const hasFilters = !!(q || estado)

  return (
    <div className="space-y-5">
      {/* Buscador + toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="search"
            key={q}
            defaultValue={q}
            onChange={handleSearch}
            placeholder="Buscar por título…"
            className="h-10 w-full rounded-xl border border-neutral-200 bg-surface pl-9 pr-4 text-sm text-ink placeholder:text-neutral-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-shadow"
          />
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className={[
            'flex h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors',
            filtersOpen
              ? 'border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100'
              : 'border-neutral-200 bg-surface text-neutral-600 hover:bg-neutral-50',
          ].join(' ')}
        >
          <FilterIcon size={15} />
          {filtersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
        </button>
      </div>

      {/* Filtros colapsables */}
      {filtersOpen && (
        <>
          {/* Estado */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Estado
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => update('estado', '')}
                className={pill(estado === '')}
              >
                Todos
              </button>
              {ESTADO_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update('estado', opt.value)}
                  className={pill(estado === opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Separador + limpiar */}
          <div className="border-t border-neutral-100 pt-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.replace('/postulante/postulaciones')}
                className={[
                  'text-xs font-medium transition-colors',
                  hasFilters
                    ? 'text-neutral-500 hover:text-neutral-800'
                    : 'cursor-not-allowed text-neutral-300',
                ].join(' ')}
                disabled={!hasFilters}
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
