'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { FilterIcon } from '@/components/icons'
import { FancySelect, SearchableSelect } from '@/components/ui'
import { SearchInput } from '@/components/shared/list-controls'
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
type Departamento = { value: string; label: string }

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
  departamentos,
  carreras,
}: {
  sectores: Sector[]
  provincias: Provincia[]
  departamentos: Departamento[]
  carreras: CarreraOption[]
}) {
  const sp = useSearchParams()
  const router = useRouter()
  const [filtersOpen, setFiltersOpen] = useState(false)

  function update(key: string, value: string) {
    const params = new URLSearchParams(sp.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    router.replace(`/postulante/puestos?${params.toString()}`)
  }

  // Al cambiar de provincia se limpia el departamento (depende de la provincia).
  function updateProvincia(value: string) {
    const params = new URLSearchParams(sp.toString())
    if (value) params.set('provincia', value)
    else params.delete('provincia')
    params.delete('departamento')
    params.delete('page')
    router.replace(`/postulante/puestos?${params.toString()}`)
  }

  const q = sp.get('q') ?? ''
  const dias = sp.get('dias') ?? ''
  const sector = sp.get('sector') ?? ''
  const carga = sp.get('carga_horaria') ?? ''
  const ubicacion = sp.get('ubicacion') ?? ''
  const provincia = sp.get('provincia') ?? ''
  const departamento = sp.get('departamento') ?? ''
  const carrera = sp.get('carrera') ?? ''
  // "postulacion" defaults to "todos" server-side, so we treat a missing param as that value.
  const postulacion = sp.get('postulacion') ?? 'todos'
  const hasFilters = !!(q || dias || sector || carga || ubicacion || provincia || departamento || carrera || sp.get('postulacion'))
  // Con filtros aplicados el panel queda abierto y no se ofrece ocultarlo: los filtros
  // se recuerdan entre pestañas y esconderlos hace pensar que no hay puestos.
  const abierto = filtersOpen || hasFilters

  return (
    <div className="space-y-5">
      {/* Buscador + toggle: lo único siempre visible. Todos los filtros (incluida
          la carrera) quedan ocultos hasta que el usuario abre "Mostrar filtros",
          para que el apartado quede simétrico. */}
      <div className="flex gap-2">
        <SearchInput placeholder="Buscar por título…" className="flex-1" />
        {!hasFilters && (
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className={[
              'flex h-10 shrink-0 items-center gap-1.5 rounded-md border px-3 text-sm font-medium transition-colors',
              filtersOpen
                ? 'border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100'
                : 'border-neutral-200 bg-surface text-neutral-600 hover:bg-neutral-50',
            ].join(' ')}
          >
            <FilterIcon size={15} />
            {filtersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
          </button>
        )}
      </div>

      {/* Filtros colapsables */}
      {abierto && (
        <>
          {/* Carrera: filtro principal, a todo el ancho. */}
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
              placeholder="Seleccioná una carrera"
              onValueChange={(value) => {
                if (value) update('carrera', value)
              }}
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
              <FancySelect
                options={[
                  { value: '', label: 'Todos los sectores' },
                  ...sectores.map((s) => ({ value: s.id, label: s.nombre_sector })),
                ]}
                value={sector}
                onChange={(value) => update('sector', value)}
                aria-label="Filtrar por sector"
              />
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

            {/* Provincia */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Provincia
              </p>
              <FancySelect
                options={[
                  { value: '', label: 'Todas las provincias' },
                  ...provincias.map((p) => ({ value: p.id, label: p.nombre })),
                ]}
                value={provincia}
                onChange={(value) => updateProvincia(value)}
                aria-label="Filtrar por provincia"
              />
            </div>

            {/* Departamento: solo se muestra cuando hay una provincia seleccionada. */}
            {provincia && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Departamento
                </p>
                <FancySelect
                  options={[{ value: '', label: 'Todos los departamentos' }, ...departamentos]}
                  value={departamento}
                  onChange={(value) => update('departamento', value)}
                  aria-label="Filtrar por departamento"
                />
              </div>
            )}

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
