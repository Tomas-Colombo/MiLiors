'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Select, SearchableSelect } from '@/components/ui'
import { StarIcon, TrashIcon, CalendarIcon } from '@/components/icons'
import { SearchInput } from '@/components/shared/list-controls'

type Puesto = { id: string; titulo_puesto: string; sinPostulaciones?: boolean }

type Props = {
  puestos: Puesto[]
  totalVisible: number
  totalTotal: number
  /** Sólo ofrecemos el toggle si el reclutador tiene algún puesto reabierto. */
  hayCiclosAnteriores: boolean
}

export function FiltrosPostulaciones({ puestos, totalVisible, totalTotal, hayCiclosAnteriores }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.delete('page')
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname)
    },
    [router, pathname, searchParams],
  )

  // Un puesto sin postulaciones (llegamos desde "Mis puestos") se incluye para
  // que su título se muestre como valor actual del filtro.
  const puestoOpts = puestos.map((p) => ({ value: p.id, label: p.titulo_puesto }))

  const puestoActual = searchParams.get('puesto') ?? ''

  const estadoOpts = [
    { value: '', label: 'Todos los estados' },
    { value: 'ENVIADA', label: 'No vistas' },
    { value: 'VISTO', label: 'Vistas' },
    { value: 'PROCESO_FINALIZADO', label: 'Descartadas' },
    { value: 'CERRADA', label: 'Cerradas' },
  ]

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <SearchInput placeholder="Buscar candidato…" className="w-full sm:w-52" />
      <div className="w-full sm:w-56">
        <SearchableSelect
          key={puestoActual}
          name="puesto"
          options={puestoOpts}
          defaultValue={puestoActual}
          placeholder="Todos los puestos"
          onValueChange={(value) => {
            // Sólo filtramos al elegir un puesto concreto de la lista; para
            // quitar el filtro se usa "Limpiar filtros" (evita re-montar el campo
            // mientras el usuario reescribe para cambiar de puesto).
            if (value) setParam('puesto', value)
          }}
        />
      </div>
      <div className="w-full sm:w-44">
        <Select
          options={estadoOpts}
          value={searchParams.get('estado') ?? ''}
          onChange={(e) => setParam('estado', e.target.value)}
          aria-label="Filtrar por estado"
        />
      </div>
      <button
        type="button"
        onClick={() => setParam('favoritos', searchParams.get('favoritos') === '1' ? '' : '1')}
        aria-pressed={searchParams.get('favoritos') === '1'}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 h-9 text-[12.5px] font-semibold whitespace-nowrap transition-colors ${
          searchParams.get('favoritos') === '1'
            ? 'bg-warning-bg text-warning-solid'
            : 'bg-neutral-100 text-muted hover:text-ink'
        }`}
      >
        <StarIcon
          size={14}
          className={
            searchParams.get('favoritos') === '1'
              ? 'fill-yellow-400 stroke-yellow-400'
              : 'stroke-current'
          }
        />
        Favoritos
      </button>
      {hayCiclosAnteriores && (
        <button
          type="button"
          onClick={() => setParam('ciclos', searchParams.get('ciclos') === 'todos' ? '' : 'todos')}
          aria-pressed={searchParams.get('ciclos') === 'todos'}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 h-9 text-[12.5px] font-semibold whitespace-nowrap transition-colors ${
            searchParams.get('ciclos') === 'todos'
              ? 'bg-primary-tint text-primary-600'
              : 'bg-neutral-100 text-muted hover:text-ink'
          }`}
        >
          <CalendarIcon size={14} />
          Ciclos anteriores
        </button>
      )}
      {(searchParams.get('q') || searchParams.get('puesto') || searchParams.get('estado') || searchParams.get('favoritos') || searchParams.get('ciclos')) && (
        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams()
            router.replace(`${pathname}?${params.toString()}`)
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-surface px-3 h-9 text-[12.5px] font-medium text-muted hover:bg-neutral-50 hover:text-ink hover:border-neutral-300 transition-colors whitespace-nowrap"
        >
          <TrashIcon size={14} />
          Limpiar filtros
        </button>
      )}
      {totalVisible !== totalTotal && (
        <span className="text-xs text-muted ml-auto">
          {totalVisible} de {totalTotal}
        </span>
      )}
    </div>
  )
}
