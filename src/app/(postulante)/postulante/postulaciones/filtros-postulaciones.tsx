'use client'

import { useSearchParams } from 'next/navigation'
import { FancySelect } from '@/components/ui'
import {
  ClearFilters,
  FilterSelect,
  FiltrosBar,
  SearchInput,
  useSetParam,
} from '@/components/shared/list-controls'
import { ESTADO_POSTULACION } from '@/lib/constants/enums'

const ESTADO_OPTS = [
  { value: '', label: 'Todos los estados' },
  { value: ESTADO_POSTULACION.ENVIADA, label: 'Enviada' },
  { value: ESTADO_POSTULACION.VISTO, label: 'Vista' },
  { value: ESTADO_POSTULACION.PROCESO_FINALIZADO, label: 'No avanza' },
  { value: ESTADO_POSTULACION.CERRADA, label: 'Cerrada' },
]

const ORDEN_OPTS = [
  { value: 'desc', label: 'Más nuevas primero' },
  { value: 'asc', label: 'Más viejas primero' },
]

export function FiltrosPostulaciones() {
  const sp = useSearchParams()
  const { setParams } = useSetParam()

  // `desc` es el orden por defecto del server: se escribe la URL sólo cuando se
  // elige el otro, para que un listado sin filtrar tenga la URL limpia.
  const orden = sp.get('orden') === 'asc' ? 'asc' : 'desc'

  return (
    <FiltrosBar>
      <SearchInput placeholder="Buscar por título…" className="w-full sm:w-56" />

      <FilterSelect
        paramKey="estado"
        options={ESTADO_OPTS}
        ariaLabel="Filtrar por estado"
        className="w-full sm:w-44"
      />

      <div className="w-full sm:w-48">
        <FancySelect
          options={ORDEN_OPTS}
          value={orden}
          onChange={(value) => setParams({ orden: value === 'asc' ? 'asc' : null })}
          aria-label="Ordenar por fecha"
        />
      </div>

      <ClearFilters keys={['q', 'estado', 'orden']} />
    </FiltrosBar>
  )
}
