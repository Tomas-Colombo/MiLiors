import { getSectoresAdmin } from '@/modules/admin/queries'
import { Table, Badge, EmptyState } from '@/components/ui'
import type { Column } from '@/components/ui'
import { GridIcon } from '@/components/icons'
import { CrearSectorForm, SectorAcciones } from './sectores-ui'
import { SearchInput, FilterSelect, ClearFilters, Paginador } from '@/components/shared/list-controls'
import { paginar } from '@/lib/pagination'

export const metadata = { title: 'Sectores — Admin TalentID' }

type Sector = {
  id: string
  nombre_sector: string
  fecha_baja_s: string | null
  created_at: string
}

const ESTADO_OPTS = [
  { value: '', label: 'Todos los estados' },
  { value: 'activo', label: 'Activos' },
  { value: 'inactivo', label: 'Inactivos' },
]

export default async function SectoresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; page?: string }>
}) {
  const sp = await searchParams
  const todos = await getSectoresAdmin()

  const q = sp.q?.trim().toLowerCase() ?? ''
  const estado = sp.estado ?? ''

  const filtrados = todos.filter(s => {
    if (estado === 'activo' && s.fecha_baja_s) return false
    if (estado === 'inactivo' && !s.fecha_baja_s) return false
    if (q && !s.nombre_sector.toLowerCase().includes(q)) return false
    return true
  })

  const { page, pageCount, slice } = paginar(filtrados, sp.page)

  const columns: Column<Sector>[] = [
    {
      key: 'nombre',
      header: 'Nombre',
      width: '2fr',
      cell: row => <span className="font-medium text-ink">{row.nombre_sector}</span>,
    },
    {
      key: 'estado',
      header: 'Estado',
      cell: row =>
        row.fecha_baja_s ? (
          <Badge tone="neutral" dot>Inactivo</Badge>
        ) : (
          <Badge tone="success" dot>Activo</Badge>
        ),
    },
    {
      key: 'created_at',
      header: 'Creado',
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
      cell: row => <SectorAcciones id={row.id} activo={!row.fecha_baja_s} />,
    },
  ]

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <h1 className="text-[22px] font-extrabold tracking-tight text-ink">Sectores industriales</h1>
      <p className="mt-1 text-[13px] text-muted">
        Los sectores inactivos se conservan como baja lógica y no se eliminan.
      </p>

      <div className="mt-8 rounded-xl border border-neutral-200 bg-surface p-6 shadow-card">
        <CrearSectorForm />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput placeholder="Buscar sector…" />
        <FilterSelect paramKey="estado" options={ESTADO_OPTS} ariaLabel="Filtrar por estado" className="w-full sm:w-44" />
        <ClearFilters keys={['q', 'estado']} />
        {filtrados.length !== todos.length && (
          <span className="whitespace-nowrap text-xs text-muted sm:ml-auto">
            {filtrados.length} de {todos.length}
          </span>
        )}
      </div>

      <div className="mt-4">
        {slice.length === 0 ? (
          <EmptyState
            icon={<GridIcon size={22} />}
            title="Sin resultados"
            description="No hay sectores que coincidan con los filtros aplicados."
          />
        ) : (
          <Table columns={columns} rows={slice} rowKey={row => row.id} />
        )}
      </div>

      <Paginador page={page} pageCount={pageCount} />
    </div>
  )
}
