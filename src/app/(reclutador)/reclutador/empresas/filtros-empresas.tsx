'use client'

import {
  ClearFilters,
  FilterSelect,
  FiltrosBar,
  SearchInput,
  TotalFiltrado,
} from '@/components/shared/list-controls'

type Props = {
  totalVisible: number
  totalTotal: number
}

const ESTADO_OPTS = [
  { value: '', label: 'Todos los estados' },
  { value: 'activa', label: 'Activas' },
  { value: 'baja', label: 'De baja' },
]

const CLAVES = ['q', 'estado']

export function FiltrosEmpresas({ totalVisible, totalTotal }: Props) {
  return (
    <FiltrosBar>
      <SearchInput placeholder="Buscar empresa…" className="w-full sm:w-56" />

      <FilterSelect
        paramKey="estado"
        options={ESTADO_OPTS}
        ariaLabel="Filtrar por estado"
        className="w-full sm:w-44"
      />

      <ClearFilters keys={CLAVES} />
      <TotalFiltrado visible={totalVisible} total={totalTotal} />
    </FiltrosBar>
  )
}
