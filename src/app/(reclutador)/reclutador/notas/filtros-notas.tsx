'use client'

import {
  ClearFilters,
  FilterSearchableSelect,
  FilterSelect,
  FiltrosBar,
  SearchInput,
  TotalFiltrado,
} from '@/components/shared/list-controls'

type Candidato = { id: string; nombre: string }

type Props = {
  candidatos: Candidato[]
  totalVisible: number
  totalTotal: number
}

const FECHA_OPTS = [
  { value: '', label: 'Todos los tiempos' },
  { value: '15', label: 'Últimos 15 días' },
  { value: '90', label: 'Últimos 3 meses' },
  { value: '180', label: 'Últimos 6 meses' },
  { value: '365', label: 'Último año' },
]

const CLAVES = ['q', 'candidato', 'dias']

export function FiltrosNotas({ candidatos, totalVisible, totalTotal }: Props) {
  return (
    <FiltrosBar>
      <SearchInput placeholder="Buscar en notas…" className="w-full sm:w-52" />

      <FilterSearchableSelect
        paramKey="candidato"
        options={candidatos.map((c) => ({ value: c.id, label: c.nombre }))}
        placeholder="Todos los candidatos"
        className="w-full sm:w-64"
      />

      <FilterSelect
        paramKey="dias"
        options={FECHA_OPTS}
        ariaLabel="Filtrar por antigüedad"
        className="w-full sm:w-44"
      />

      <ClearFilters keys={CLAVES} />
      <TotalFiltrado visible={totalVisible} total={totalTotal} />
    </FiltrosBar>
  )
}
