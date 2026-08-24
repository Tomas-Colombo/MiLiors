import { getCompetenciasAdmin } from '@/modules/admin/queries'
import { Table, Badge, EmptyState } from '@/components/ui'
import type { Column } from '@/components/ui'
import { BarChartIcon } from '@/components/icons'
import { CrearCompetenciaForm, CompetenciaAcciones } from './competencias-ui'
import { SearchInput, FilterSelect, FiltroFechas, ClearFilters, Paginador } from '@/components/shared/list-controls'
import { paginar } from '@/lib/pagination'

export const metadata = { title: 'Habilidades/Tecnologías — Admin MiLiors' }

type Competencia = {
  id: string
  nombre: string
  fecha_baja: string | null
  created_at: string
}

const ESTADO_OPTS = [
  { value: '', label: 'Todos los estados' },
  { value: 'activa', label: 'Activas' },
  { value: 'inactiva', label: 'Inactivas' },
]

const ORDEN_OPTS = [
  { value: '', label: 'Nombre (A–Z)' },
  { value: 'nombre_desc', label: 'Nombre (Z–A)' },
  { value: 'alta_desc', label: 'Alta: más reciente' },
  { value: 'alta_asc', label: 'Alta: más antigua' },
]

const FILTRO_KEYS = ['q', 'estado', 'desde', 'hasta', 'orden']

export default async function CompetenciasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; desde?: string; hasta?: string; orden?: string; page?: string }>
}) {
  const sp = await searchParams
  const todas = await getCompetenciasAdmin()

  const q = sp.q?.trim().toLowerCase() ?? ''
  const estado = sp.estado ?? ''
  const desde = sp.desde ?? ''
  // El rango es inclusive: `hasta` corta al final del día elegido.
  const hasta = sp.hasta ? `${sp.hasta}T23:59:59.999Z` : ''

  const filtradas = todas.filter(c => {
    if (estado === 'activa' && c.fecha_baja) return false
    if (estado === 'inactiva' && !c.fecha_baja) return false
    if (desde && c.created_at < desde) return false
    if (hasta && c.created_at > hasta) return false
    if (q && !c.nombre.toLowerCase().includes(q)) return false
    return true
  })

  // La query ya viene alfabética; el resto de los órdenes se aplica acá.
  const orden = sp.orden ?? ''
  const visibles =
    orden === ''
      ? filtradas
      : [...filtradas].sort((a, b) => {
          if (orden === 'alta_desc') return b.created_at.localeCompare(a.created_at)
          if (orden === 'alta_asc') return a.created_at.localeCompare(b.created_at)
          return -a.nombre.localeCompare(b.nombre, 'es')
        })

  const { page, pageCount, slice } = paginar(visibles, sp.page)

  const columns: Column<Competencia>[] = [
    {
      key: 'nombre',
      header: 'Nombre',
      width: '2fr',
      cell: row => <span className="font-medium text-ink">{row.nombre}</span>,
    },
    {
      key: 'estado',
      header: 'Estado',
      cell: row =>
        row.fecha_baja ? (
          <Badge tone="neutral" dot>Inactiva</Badge>
        ) : (
          <Badge tone="success" dot>Activa</Badge>
        ),
    },
    {
      key: 'created_at',
      header: 'Creada',
      cell: row => (
        <span className="text-muted">
          {new Date(row.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'acciones',
      header: '',
      align: 'right',
      cell: row => <CompetenciaAcciones id={row.id} activa={!row.fecha_baja} />,
    },
  ]

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <h1 className="text-[22px] font-extrabold tracking-tight text-ink">Habilidades y tecnologías</h1>
      <p className="mt-1 text-[13px] text-muted">
        Las habilidades/tecnologías inactivas se conservan como baja lógica y no se eliminan.
      </p>

      <div className="mt-8 rounded-xl border border-neutral-200 bg-surface p-6 shadow-card">
        <CrearCompetenciaForm />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput placeholder="Buscar habilidad/tecnología…" />
        <FilterSelect paramKey="estado" options={ESTADO_OPTS} ariaLabel="Filtrar por estado" className="w-full sm:w-44" />
        <FilterSelect paramKey="orden" options={ORDEN_OPTS} ariaLabel="Ordenar habilidades" className="w-full sm:w-48" />
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <FiltroFechas label="fecha de alta" />
        <div className="flex items-center gap-3 sm:pb-1">
          <ClearFilters keys={FILTRO_KEYS} />
          {visibles.length !== todas.length && (
            <span className="whitespace-nowrap text-xs text-muted">
              {visibles.length} de {todas.length}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4">
        {slice.length === 0 ? (
          <EmptyState
            icon={<BarChartIcon size={22} />}
            title="Sin resultados"
            description="No hay habilidades/tecnologías que coincidan con los filtros aplicados."
          />
        ) : (
          <Table columns={columns} rows={slice} rowKey={row => row.id} />
        )}
      </div>

      <Paginador page={page} pageCount={pageCount} />
    </div>
  )
}
