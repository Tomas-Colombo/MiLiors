'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback, useRef } from 'react'
import { SearchableSelect } from '@/components/ui'
import { SearchIcon, TrashIcon } from '@/components/icons'

type CompetenciaOpt = { value: string; label: string }
type Provincia = { id: string; nombre: string }
type Localidad = { value: string; label: string }
type CarreraOpt = { value: string; label: string }

const OPCION_OTRAS_CARRERA = { value: 'OTRAS', label: 'Otras (cargadas por postulantes)' }

export function PostulantesFilters({
  competencias,
  provincias,
  localidades,
  carreras,
  carrerasOtras,
}: {
  competencias: CompetenciaOpt[]
  provincias: Provincia[]
  localidades: Localidad[]
  carreras: CarreraOpt[]
  carrerasOtras?: CarreraOpt[]
}) {
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

  // Al cambiar de provincia se limpia la localidad (depende de la provincia).
  const setProvincia = useCallback(
    (value: string) => {
      const params = new URLSearchParams(sp.toString())
      if (value) params.set('provincia', value)
      else params.delete('provincia')
      params.delete('localidad')
      params.delete('page')
      router.replace(`${pathname}?${params.toString()}`)
    },
    [router, pathname, sp],
  )

  // Al cambiar de carrera se limpia carreraOtra (depende de haber elegido "Otras").
  const setCarrera = useCallback(
    (value: string) => {
      const params = new URLSearchParams(sp.toString())
      if (value) params.set('carrera', value)
      else params.delete('carrera')
      params.delete('carreraOtra')
      params.delete('page')
      router.replace(`${pathname}?${params.toString()}`)
    },
    [router, pathname, sp],
  )

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => setParam('busqueda', val), 380)
    },
    [setParam],
  )

  const busqueda = sp.get('busqueda') ?? ''
  const competencia = sp.get('competencia') ?? ''
  const provincia = sp.get('provincia') ?? ''
  const localidad = sp.get('localidad') ?? ''
  const carrera = sp.get('carrera') ?? ''
  const carreraOtra = sp.get('carreraOtra') ?? ''
  const hasFilters = !!(busqueda || competencia || provincia || localidad || carrera || carreraOtra)

  const provinciaOpts = provincias.map((p) => ({ value: p.id, label: p.nombre }))
  const carreraOpts = [...carreras, OPCION_OTRAS_CARRERA]

  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-start sm:items-center">
      <div className="w-full sm:w-56">
        <SearchableSelect
          key={carrera}
          name="carrera"
          options={carreraOpts}
          defaultValue={carrera}
          placeholder="Todas las carreras"
          onValueChange={(value) => {
            if (value) setCarrera(value)
          }}
        />
      </div>
      {/* El segundo select solo aparece si se eligió la opción "Otras". */}
      {carrera === 'OTRAS' && (
        <div className="w-full sm:w-56">
          <SearchableSelect
            key={`${carrera}-${carreraOtra}`}
            name="carreraOtra"
            options={carrerasOtras ?? []}
            defaultValue={carreraOtra}
            placeholder="Todas las carreras cargadas"
            onValueChange={(value) => {
              if (value) setParam('carreraOtra', value)
            }}
          />
        </div>
      )}
      <div className="w-full sm:w-56">
        <SearchableSelect
          key={provincia}
          name="provincia"
          options={provinciaOpts}
          defaultValue={provincia}
          placeholder="Todas las provincias"
          onValueChange={(value) => {
            if (value) setProvincia(value)
          }}
        />
      </div>
      {/* La localidad solo se muestra una vez elegida la provincia. */}
      {provincia && (
        <div className="w-full sm:w-56">
          <SearchableSelect
            key={`${provincia}-${localidad}`}
            name="localidad"
            options={localidades}
            defaultValue={localidad}
            placeholder="Todas las localidades"
            onValueChange={(value) => {
              if (value) setParam('localidad', value)
            }}
          />
        </div>
      )}
      <div className="w-full sm:w-56">
        <SearchableSelect
          key={competencia}
          name="competencia"
          options={competencias}
          defaultValue={competencia}
          placeholder="Todas las habilidades/tecnologías"
          onValueChange={(value) => {
            if (value) setParam('competencia', value)
          }}
        />
      </div>
      <div className="relative w-full sm:w-56">
        <SearchIcon
          size={16}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
        />
        <input
          type="search"
          key={busqueda}
          defaultValue={busqueda}
          onChange={handleSearch}
          placeholder="Buscar por nombre…"
          className="h-10 w-full rounded-md border border-neutral-300 bg-surface pl-9 pr-3.5 font-sans text-sm text-ink outline-none placeholder:text-neutral-400 transition-[border,box-shadow] focus:border-[1.5px] focus:border-primary-600 focus:ring-[3px] focus:ring-primary-50"
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
