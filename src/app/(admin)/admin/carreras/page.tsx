import { getCarrerasAdmin, getCarrerasOtrasAdmin } from '@/modules/admin/queries'
import type { CarreraAdmin, CarreraOtraAdmin } from '@/modules/admin/queries'
import { Table, Badge, EmptyState } from '@/components/ui'
import type { Column } from '@/components/ui'
import { NotebookIcon } from '@/components/icons'
import { CrearCarreraForm, CarreraAcciones, PromoverCarreraOtraBoton } from './carreras-ui'
import { SearchInput, FilterSelect, ClearFilters, Paginador, FiltroFechas } from '@/components/shared/list-controls'
import { paginar } from '@/lib/pagination'

export const metadata = { title: 'Carreras — Admin MiLiors' }

const ESTADO_OPTS = [
  { value: '', label: 'Todos los estados' },
  { value: 'activo', label: 'Activas' },
  { value: 'inactivo', label: 'Inactivas' },
]

export default async function CarrerasPage({
  searchParams,
}: {
  searchParams: Promise<{
    qA?: string
    estadoA?: string
    pageA?: string
    qB?: string
    desde?: string
    hasta?: string
  }>
}) {
  const sp = await searchParams

  // ─── Sección A: carreras oficiales ─────────────────────────────────────
  const todas = await getCarrerasAdmin()

  const qA = sp.qA?.trim().toLowerCase() ?? ''
  const estadoA = sp.estadoA ?? ''

  const filtradasA = todas.filter((c) => {
    if (estadoA === 'activo' && c.fecha_baja) return false
    if (estadoA === 'inactivo' && !c.fecha_baja) return false
    if (qA && !c.nombre.toLowerCase().includes(qA)) return false
    return true
  })

  const { page: pageA, pageCount: pageCountA, slice: sliceA } = paginar(filtradasA, sp.pageA)

  const columnsA: Column<CarreraAdmin>[] = [
    {
      key: 'nombre',
      header: 'Nombre',
      width: '2fr',
      cell: (row) => <span className="font-medium text-ink">{row.nombre}</span>,
    },
    {
      key: 'estado',
      header: 'Estado',
      cell: (row) =>
        row.fecha_baja ? (
          <Badge tone="neutral" dot>Inactiva</Badge>
        ) : (
          <Badge tone="success" dot>Activa</Badge>
        ),
    },
    {
      key: 'created_at',
      header: 'Creada',
      cell: (row) => (
        <span className="text-muted">
          {new Date(row.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'acciones',
      header: '',
      align: 'right',
      cell: (row) => <CarreraAcciones id={row.id} nombre={row.nombre} activo={!row.fecha_baja} />,
    },
  ]

  // ─── Sección B: carreras cargadas por postulantes ("otras") ────────────
  const qB = sp.qB?.trim() ?? ''
  const desde = sp.desde ?? ''
  const hasta = sp.hasta ?? ''

  const otras = await getCarrerasOtrasAdmin({
    q: qB || undefined,
    desde: desde || undefined,
    hasta: hasta || undefined,
  })

  const columnsB: Column<CarreraOtraAdmin>[] = [
    {
      key: 'nombre',
      header: 'Título',
      width: '2fr',
      cell: (row) => <span className="font-medium text-ink">{row.nombre}</span>,
    },
    {
      key: 'cantidad',
      header: 'Postulantes',
      cell: (row) => <span className="text-muted">{row.cantidad}</span>,
    },
    {
      key: 'primeraFecha',
      header: 'Primera vez cargada',
      cell: (row) => (
        <span className="text-muted">{new Date(row.primeraFecha).toLocaleDateString('es-AR')}</span>
      ),
    },
    {
      key: 'acciones',
      header: '',
      align: 'right',
      cell: (row) => <PromoverCarreraOtraBoton nombre={row.nombre} />,
    },
  ]

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <h1 className="text-[22px] font-extrabold tracking-tight text-ink">Carreras</h1>
      <p className="mt-1 text-[13px] text-muted">
        Catálogo oficial de carreras y valores de texto libre cargados por postulantes.
      </p>

      {/* ─── Carreras oficiales ─────────────────────────────────── */}
      <h2 className="mt-8 text-[15px] font-bold text-ink">Carreras oficiales</h2>

      <div className="mt-3 rounded-xl border border-neutral-200 bg-surface p-6 shadow-card">
        <CrearCarreraForm />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput paramKey="qA" placeholder="Buscar carrera…" />
        <FilterSelect paramKey="estadoA" options={ESTADO_OPTS} ariaLabel="Filtrar por estado" className="w-full sm:w-44" />
        <ClearFilters keys={['qA', 'estadoA']} />
        {filtradasA.length !== todas.length && (
          <span className="whitespace-nowrap text-xs text-muted sm:ml-auto">
            {filtradasA.length} de {todas.length}
          </span>
        )}
      </div>

      <div className="mt-4">
        {sliceA.length === 0 ? (
          <EmptyState
            icon={<NotebookIcon size={22} />}
            title="Sin resultados"
            description="No hay carreras que coincidan con los filtros aplicados."
          />
        ) : (
          <Table columns={columnsA} rows={sliceA} rowKey={(row) => row.id} />
        )}
      </div>

      <Paginador page={pageA} pageCount={pageCountA} paramKey="pageA" />

      {/* ─── Cargadas por postulantes (otras) ──────────────────────── */}
      <h2 className="mt-10 text-[15px] font-bold text-ink">Cargadas por postulantes (Otras)</h2>
      <p className="mt-1 text-[13px] text-muted">
        Valores de texto libre que los postulantes cargaron cuando su carrera no estaba en el catálogo.
      </p>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <SearchInput paramKey="qB" placeholder="Buscar título…" />
        <FiltroFechas label="fecha de alta" />
        <ClearFilters keys={['qB', 'desde', 'hasta']} />
      </div>

      <div className="mt-4">
        {otras.length === 0 ? (
          <EmptyState
            icon={<NotebookIcon size={22} />}
            title="Sin resultados"
            description="No hay carreras cargadas por postulantes que coincidan con los filtros aplicados."
          />
        ) : (
          <Table columns={columnsB} rows={otras} rowKey={(row) => row.nombre} />
        )}
      </div>
    </div>
  )
}
