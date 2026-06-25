'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useCallback, useRef } from 'react'
import { SearchIcon } from '@/components/icons'
import { CARGA_HORARIA_LABEL, UBICACION_LABEL } from '@/lib/constants/enums'

const TIEMPO_OPTIONS = [
  { label: 'Todo', value: '' },
  { label: '15 días', value: '15' },
  { label: '1 mes', value: '30' },
  { label: '3 meses', value: '90' },
]

type Sector = { id: string; nombre_sector: string }

function pill(active: boolean) {
  return [
    'rounded-full px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer select-none',
    active
      ? 'bg-primary-600 text-white shadow-sm'
      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
  ].join(' ')
}

export function PuestosFilters({ sectores }: { sectores: Sector[] }) {
  const sp = useSearchParams()
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function update(key: string, value: string) {
    const params = new URLSearchParams(sp.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    router.replace(`/postulante/puestos?${params.toString()}`)
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
  const dias = sp.get('dias') ?? ''
  const sector = sp.get('sector') ?? ''
  const carga = sp.get('carga_horaria') ?? ''
  const ubicacion = sp.get('ubicacion') ?? ''
  const hasFilters = !!(q || dias || sector || carga || ubicacion)

  return (
    <div className="space-y-5">
      {/* Buscador */}
      <div className="relative">
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
          className="h-10 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-4 text-sm text-ink placeholder:text-neutral-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 transition-shadow"
        />
      </div>

      {/* Filtros en grilla */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Publicados */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Publicados
          </p>
          <div className="flex flex-wrap gap-1.5">
            {TIEMPO_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => update('dias', opt.value)}
                className={pill(dias === opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sector */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Sector
          </p>
          <div className="relative">
            <select
              value={sector}
              onChange={(e) => update('sector', e.target.value)}
              className="h-9 w-full appearance-none rounded-lg border border-neutral-200 bg-white pl-3 pr-8 text-sm text-ink focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 cursor-pointer"
            >
              <option value="">Todos los sectores</option>
              {sectores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre_sector}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px]">
              ▾
            </span>
          </div>
        </div>

        {/* Modalidad */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Modalidad
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => update('ubicacion', '')}
              className={pill(ubicacion === '')}
            >
              Todas
            </button>
            {Object.entries(UBICACION_LABEL).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => update('ubicacion', val)}
                className={pill(ubicacion === val)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Dedicación */}
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Dedicación
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => update('carga_horaria', '')}
              className={pill(carga === '')}
            >
              Cualquiera
            </button>
            {Object.entries(CARGA_HORARIA_LABEL).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => update('carga_horaria', val)}
                className={pill(carga === val)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {hasFilters && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => router.replace('/postulante/puestos')}
            className="text-xs text-neutral-400 hover:text-neutral-700 transition-colors"
          >
            × Limpiar filtros
          </button>
        </div>
      )}
    </div>
  )
}
