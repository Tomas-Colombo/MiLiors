'use client'

import {
  ClearFilters,
  FilterSelect,
  FiltrosBar,
  SearchInput,
  TotalFiltrado,
} from '@/components/shared/list-controls'

type Props = {
  /** Empresas del reclutador. Con una sola no se ofrece el filtro. */
  empresas: { value: string; label: string }[]
  totalVisible: number
  totalTotal: number
}

const ORDEN_OPTS = [
  { value: '', label: 'Apertura reciente' },
  { value: 'antiguos', label: 'Apertura antigua' },
  { value: 'pausa', label: 'Pausa reciente' },
  { value: 'pausa_antiguos', label: 'Pausa antigua' },
]

const ESTADO_OPTS = [
  { value: '', label: 'Todos los estados' },
  { value: 'activo', label: 'Activos' },
  { value: 'cerrado', label: 'Pausados' },
]

const CLAVES = ['q', 'orden', 'estado', 'empresa']

export function FiltrosPuestos({ empresas, totalVisible, totalTotal }: Props) {
  return (
    <FiltrosBar>
      <SearchInput placeholder="Buscar por título…" className="w-full sm:w-56" />

      <FilterSelect
        paramKey="orden"
        options={ORDEN_OPTS}
        ariaLabel="Ordenar por fecha"
        className="w-full sm:w-44"
      />

      <FilterSelect
        paramKey="estado"
        options={ESTADO_OPTS}
        ariaLabel="Filtrar por estado"
        className="w-full sm:w-44"
      />

      {empresas.length > 1 && (
        <FilterSelect
          paramKey="empresa"
          options={[{ value: '', label: 'Todas las empresas' }, ...empresas]}
          ariaLabel="Filtrar por empresa"
          className="w-full sm:w-52"
        />
      )}

      <ClearFilters keys={CLAVES} />
      <TotalFiltrado visible={totalVisible} total={totalTotal} />
    </FiltrosBar>
  )
}
