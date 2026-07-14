'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import { SearchIcon, FilterIcon } from '@/components/icons'
import { SearchableSelect } from '@/components/ui'
import { CARGA_HORARIA_LABEL, UBICACION_LABEL } from '@/lib/constants/enums'
import type { CarreraOption } from '@/modules/carreras/queries'

const TIEMPO_OPTIONS = [
  { label: 'Todo', value: '' },
  { label: '15 días', value: '15' },
  { label: '1 mes', value: '30' },
  { label: '3 meses', value: '90' },
]

type Sector = { id: string; nombre_sector: string }
type Provincia = { id: string; nombre: string }
type Localidad = { value: string; label: string }

function pill(active: boolean) {
  return [
    'rounded-full px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer select-none',
    active
      ? 'bg-primary-600 text-white shadow-sm'
      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
  ].join(' ')
}

export function PuestosFilters({
  sectores,
  provincias,
  localidades,
  carreras,
}: {
  sectores: Sector[]
  provincias: Provincia[]
  localidades: Localidad[]
  carreras: CarreraOption[]
}) {
  const sp = useSearchParams()
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  function update(key: string, value: string) {
    const params = new URLSearchParams(sp.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    router.replace(`/postulante/puestos?${params.toString()}`)
  }

  // Al cambiar de provincia se limpia la localidad (depende de la provincia).
  function updateProvincia(value: string) {
    const params = new URLSearchParams(sp.toString())
    if (value) params.set('provincia', value)
    else params.delete('provincia')
    params.delete('localidad')
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
  const provincia = sp.get('provincia') ?? ''
  const localidad = sp.get('localidad') ?? ''
  const carrera = sp.get('carrera') ?? ''
  // "postulacion" defaults to "no_postulados" server-side, so we treat missing param as that value.
  const postulacion = sp.get('postulacion') ?? 'no_postulados'
  const hasFilters = !!(q || dias || sector || carga || ubicacion || provincia || localidad || carrera || sp.get('postulacion'))

  return (
    <div className="space-y-5">
      {/* Filtro principal: carrera. Es el filtro más relevante para el postulante,
          por eso va primero, a todo el ancho y siempre visible (no depende de
          "Mostrar filtros"). Estilo sobrio, consistente con el resto de filtros. */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Carrera
          </p>
          {carrera && (
            <button
              type="button"
              onClick={() => update('carrera', '')}
              className="text-xs font-medium text-neutral-500 hover:text-neutral-700 transition-colors"
            >
              Quitar
            </button>
          )}
        </div>
        {/* Solo navega al elegir una opción: SearchableSelect emite '' en cada tipeo
            y eso remontaría el componente (key) borrando lo escrito. Limpiar es
            explícito, vía "Quitar" o "Limpiar filtros". */}
        <SearchableSelect
          key={carrera}
          name="carrera"
          options={carreras}
          defaultValue={carrera}
          placeholder="Elegí tu carrera para ver los puestos más relevantes…"
          onValueChange={(value) => {
            if (value) update('carrera', value)
          }}
        />
      </div>

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
                  className="h-9 w-full appearance-none rounded-lg border border-neutral-200 bg-surface pl-3 pr-8 text-sm text-ink focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 cursor-pointer"
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

            {/* Provincia */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Provincia
              </p>
              <div className="relative">
                <select
                  value={provincia}
                  onChange={(e) => updateProvincia(e.target.value)}
                  className="h-9 w-full appearance-none rounded-lg border border-neutral-200 bg-surface pl-3 pr-8 text-sm text-ink focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 cursor-pointer"
                >
                  <option value="">Todas las provincias</option>
                  {provincias.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px]">
                  ▾
                </span>
              </div>
            </div>

            {/* Localidad (depende de la provincia) */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Localidad
              </p>
              <div className="relative">
                <select
                  value={localidad}
                  onChange={(e) => update('localidad', e.target.value)}
                  disabled={!provincia}
                  className="h-9 w-full appearance-none rounded-lg border border-neutral-200 bg-surface pl-3 pr-8 text-sm text-ink focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 cursor-pointer disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400"
                >
                  <option value="">
                    {provincia ? 'Todas las localidades' : 'Elegí una provincia'}
                  </option>
                  {localidades.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 text-[10px]">
                  ▾
                </span>
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

            {/* Mis postulaciones */}
            <div className="space-y-2 sm:col-span-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Mis postulaciones
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => update('postulacion', 'todos')}
                  className={pill(postulacion === 'todos')}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => update('postulacion', 'no_postulados')}
                  className={pill(postulacion === 'no_postulados')}
                >
                  No postulé
                </button>
                <button
                  type="button"
                  onClick={() => update('postulacion', 'postulados')}
                  className={pill(postulacion === 'postulados')}
                >
                  Ya postulé
                </button>
              </div>
            </div>
          </div>

          {/* Separador + limpiar */}
          <div className="border-t border-neutral-100 pt-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => router.replace('/postulante/puestos')}
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
