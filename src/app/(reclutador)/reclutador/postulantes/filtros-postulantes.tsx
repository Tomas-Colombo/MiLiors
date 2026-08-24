'use client'

import { useSearchParams } from 'next/navigation'
import {
  ClearFilters,
  FilterSearchableSelect,
  FiltrosBar,
  SearchInput,
} from '@/components/shared/list-controls'

type Opcion = { value: string; label: string }
type Provincia = { id: string; nombre: string }

const OPCION_OTRAS_CARRERA = { value: 'OTRAS', label: 'Otras (cargadas por postulantes)' }

const CLAVES = ['busqueda', 'competencia', 'provincia', 'departamento', 'carrera', 'carreraOtra']

export function FiltrosPostulantes({
  competencias,
  provincias,
  departamentos,
  carreras,
  carrerasOtras,
}: {
  competencias: Opcion[]
  provincias: Provincia[]
  departamentos: Opcion[]
  carreras: Opcion[]
  carrerasOtras?: Opcion[]
}) {
  const sp = useSearchParams()
  const carrera = sp.get('carrera') ?? ''
  const provincia = sp.get('provincia') ?? ''

  return (
    <FiltrosBar wrap>
      {/* Elegir carrera descarta la carrera libre, y elegir provincia descarta
          el departamento: en los dos casos el valor viejo ya no pertenece al
          nuevo padre. Lo resuelve `alsoClear`. */}
      <FilterSearchableSelect
        paramKey="carrera"
        options={[...carreras, OPCION_OTRAS_CARRERA]}
        placeholder="Todas las carreras"
        alsoClear={['carreraOtra']}
        className="w-full sm:w-56"
      />

      {/* El segundo select sólo aparece si se eligió la opción "Otras". */}
      {carrera === 'OTRAS' && (
        <FilterSearchableSelect
          paramKey="carreraOtra"
          options={carrerasOtras ?? []}
          placeholder="Todas las carreras cargadas"
          className="w-full sm:w-56"
        />
      )}

      <FilterSearchableSelect
        paramKey="provincia"
        options={provincias.map((p) => ({ value: p.id, label: p.nombre }))}
        placeholder="Todas las provincias"
        alsoClear={['departamento']}
        className="w-full sm:w-56"
      />

      {/* El departamento sólo se muestra una vez elegida la provincia. */}
      {provincia && (
        <FilterSearchableSelect
          paramKey="departamento"
          options={departamentos}
          placeholder="Todos los departamentos"
          className="w-full sm:w-56"
        />
      )}

      <FilterSearchableSelect
        paramKey="competencia"
        options={competencias}
        placeholder="Todas las habilidades/tecnologías"
        className="w-full sm:w-56"
      />

      <SearchInput paramKey="busqueda" placeholder="Buscar por nombre…" className="w-full sm:w-56" />

      <ClearFilters keys={CLAVES} />
    </FiltrosBar>
  )
}
