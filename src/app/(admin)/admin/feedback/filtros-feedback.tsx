'use client'

import { useCallback, useState } from 'react'
import { FancySelect, DateInput } from '@/components/ui'
import { FilterIcon } from '@/components/icons'
import {
  CampoFiltro,
  ClearFilters,
  TotalFiltrado,
  useSetParam,
} from '@/components/shared/list-controls'
import { COMPETENCIAS, ENEATIPO_NOMBRES } from '@/modules/informe/competencias'

type Props = {
  totalVisible: number
  totalTotal: number
}

const DIAS_OPTS = [
  { value: '', label: 'Todo el histórico' },
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
]

const NIVEL_OPTS = [
  { value: '', label: 'Todos los niveles' },
  { value: 'Alto', label: 'Alto' },
  { value: 'Medio-Alto', label: 'Medio-Alto' },
  { value: 'Medio', label: 'Medio' },
  { value: 'Medio-Bajo', label: 'Medio-Bajo' },
  { value: 'Bajo', label: 'Bajo' },
]

const VALORACION_OPTS = [
  { value: '', label: 'Todas las respuestas' },
  { value: 'SUBESTIMA', label: 'Les queda bajo' },
  { value: 'JUSTO', label: 'Está bien' },
  { value: 'SOBRESTIMA', label: 'Les queda alto' },
]

const ENEATIPO_OPTS = [
  { value: '', label: 'Todos los eneatipos' },
  ...Object.entries(ENEATIPO_NOMBRES).map(([num, nombre]) => ({
    value: num,
    label: `${num}. ${nombre}`,
  })),
]

const COMPETENCIA_OPTS = [
  { value: '', label: 'Todas las competencias' },
  ...COMPETENCIAS.map(c => ({ value: c.key, label: c.nombre })),
]

/** Claves que cuentan como "filtro activo" para el badge y para Limpiar. */
const CLAVES = ['eneatipo', 'competencia', 'nivel', 'valoracion', 'dias', 'desde', 'hasta'] as const

export function FiltrosFeedback({ totalVisible, totalTotal }: Props) {
  const { searchParams, setParams } = useSetParam()
  const [abierto, setAbierto] = useState(false)

  // `pageC` es el paginador del segundo listado de esta pantalla: al filtrar,
  // los dos vuelven a su primera página.
  const setParam = useCallback(
    (key: string, value: string) => setParams({ [key]: value || null, pageC: null }),
    [setParams],
  )

  const activos = CLAVES.filter(k => searchParams.get(k)).length
  const desde = searchParams.get('desde') ?? ''
  const hasta = searchParams.get('hasta') ?? ''
  // El rango explícito manda sobre el atajo de días (mismo criterio que el server).
  const hayRango = !!(desde || hasta)
  // Con filtros aplicados el panel queda abierto y no se ofrece ocultarlo: los filtros
  // se recuerdan entre pestañas y esconderlos hace pensar que no hay resultados.
  const panelAbierto = abierto || activos > 0

  return (
    <div className="space-y-4">
      {/* Barra siempre visible: los filtros quedan plegados para no comerse la pantalla. */}
      <div className="flex flex-wrap items-center gap-2">
        {activos > 0 ? (
          <span className="inline-flex h-9 items-center gap-1.5 rounded-md border border-primary-200 bg-primary-50 px-3 text-[12.5px] font-medium text-primary-700">
            <FilterIcon size={14} />
            Filtros
            <span className="ml-0.5 rounded-full bg-primary-600 px-1.5 text-[10px] font-bold text-white">
              {activos}
            </span>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setAbierto(o => !o)}
            className={[
              'inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-[12.5px] font-medium transition-colors',
              abierto
                ? 'border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100'
                : 'border-neutral-200 bg-surface text-muted hover:bg-neutral-50 hover:text-ink hover:border-neutral-300',
            ].join(' ')}
          >
            <FilterIcon size={14} />
            {abierto ? 'Ocultar filtros' : 'Mostrar filtros'}
          </button>
        )}

        <ClearFilters keys={[...CLAVES]} alsoClear={['pageC']} />

        <TotalFiltrado visible={totalVisible} total={totalTotal} />
      </div>

      {panelAbierto && (
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-neutral-200 bg-surface p-4 sm:grid-cols-3">
          <CampoFiltro label="Eneatipo dominante">
            <FancySelect
              options={ENEATIPO_OPTS}
              value={searchParams.get('eneatipo') ?? ''}
              onChange={value => setParam('eneatipo', value)}
              aria-label="Filtrar por eneatipo dominante"
            />
          </CampoFiltro>

          <CampoFiltro label="Competencia">
            <FancySelect
              options={COMPETENCIA_OPTS}
              value={searchParams.get('competencia') ?? ''}
              onChange={value => setParam('competencia', value)}
              aria-label="Filtrar por competencia"
            />
          </CampoFiltro>

          <CampoFiltro label="Nivel mostrado">
            <FancySelect
              options={NIVEL_OPTS}
              value={searchParams.get('nivel') ?? ''}
              onChange={value => setParam('nivel', value)}
              aria-label="Filtrar por nivel mostrado"
            />
          </CampoFiltro>

          <CampoFiltro label="Valoración">
            <FancySelect
              options={VALORACION_OPTS}
              value={searchParams.get('valoracion') ?? ''}
              onChange={value => setParam('valoracion', value)}
              aria-label="Filtrar por valoración"
            />
          </CampoFiltro>

          <CampoFiltro label="Período">
            <FancySelect
              options={DIAS_OPTS}
              value={searchParams.get('dias') ?? ''}
              onChange={value => setParam('dias', value)}
              disabled={hayRango}
              aria-label="Filtrar por período"
            />
          </CampoFiltro>

          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Rango de fechas
            </p>
            <div className="flex items-center gap-2">
              <DateInput
                className="min-w-0 flex-1"
                value={desde}
                max={hasta || undefined}
                onChange={value => setParam('desde', value)}
                aria-label="Desde"
              />
              <span className="text-[11px] text-neutral-400">a</span>
              <DateInput
                className="min-w-0 flex-1"
                value={hasta}
                min={desde || undefined}
                onChange={value => setParam('hasta', value)}
                aria-label="Hasta"
              />
            </div>
          </div>

          {hayRango && (
            <p className="text-[11px] text-muted sm:col-span-3">
              El rango de fechas tiene prioridad sobre el período.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
