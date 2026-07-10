import { getProvinciasAdmin, getLocalidadesAdmin } from '@/modules/admin/queries'
import type { ProvinciaAdmin, LocalidadAdmin } from '@/modules/admin/queries'
import { Table, Badge, EmptyState } from '@/components/ui'
import type { Column } from '@/components/ui'
import { MapPinIcon } from '@/components/icons'
import {
  CrearProvinciaForm,
  ProvinciaAcciones,
  CrearLocalidadForm,
  LocalidadAcciones,
} from './ubicaciones-ui'
import { SearchInput, FilterSelect, ClearFilters, Paginador } from '@/components/shared/list-controls'
import { paginar } from '@/lib/pagination'

export const metadata = { title: 'Ubicaciones — Admin TalentID' }

const ESTADO_OPTS = [
  { value: '', label: 'Todos los estados' },
  { value: 'activo', label: 'Activos' },
  { value: 'inactivo', label: 'Inactivos' },
]

function estadoCell<T extends { fecha_baja: string | null }>(row: T) {
  return row.fecha_baja ? (
    <Badge tone="neutral" dot>Inactivo</Badge>
  ) : (
    <Badge tone="success" dot>Activo</Badge>
  )
}

function fechaCell(iso: string) {
  return (
    <span className="text-muted">
      {new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
    </span>
  )
}

export default async function UbicacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ prov?: string; q?: string; estado?: string; page?: string }>
}) {
  const sp = await searchParams
  const provincias = await getProvinciasAdmin()

  const provSeleccionada = sp.prov ?? ''
  const localidades = provSeleccionada ? await getLocalidadesAdmin(provSeleccionada) : []

  const q = sp.q?.trim().toLowerCase() ?? ''
  const estado = sp.estado ?? ''

  const locFiltradas = localidades.filter((l) => {
    if (estado === 'activo' && l.fecha_baja) return false
    if (estado === 'inactivo' && !l.fecha_baja) return false
    if (q && !l.nombre.toLowerCase().includes(q)) return false
    return true
  })

  const { page, pageCount, slice } = paginar(locFiltradas, sp.page)

  const provinciaOpts = [
    { value: '', label: 'Elegí una provincia…' },
    ...provincias.map((p) => ({
      value: p.id,
      label: p.fecha_baja ? `${p.nombre} (inactiva)` : p.nombre,
    })),
  ]

  const provColumns: Column<ProvinciaAdmin>[] = [
    {
      key: 'nombre',
      header: 'Provincia',
      width: '2fr',
      cell: (row) => <span className="font-medium text-ink">{row.nombre}</span>,
    },
    { key: 'estado', header: 'Estado', cell: estadoCell },
    { key: 'created_at', header: 'Creada', cell: (row) => fechaCell(row.created_at) },
    {
      key: 'acciones',
      header: '',
      align: 'right',
      cell: (row) => <ProvinciaAcciones id={row.id} nombre={row.nombre} activo={!row.fecha_baja} />,
    },
  ]

  const locColumns: Column<LocalidadAdmin>[] = [
    {
      key: 'nombre',
      header: 'Localidad',
      width: '2fr',
      cell: (row) => <span className="font-medium text-ink">{row.nombre}</span>,
    },
    {
      key: 'departamento',
      header: 'Departamento',
      cell: (row) => <span className="text-muted">{row.departamento ?? '—'}</span>,
    },
    { key: 'estado', header: 'Estado', cell: estadoCell },
    {
      key: 'acciones',
      header: '',
      align: 'right',
      cell: (row) => <LocalidadAcciones id={row.id} nombre={row.nombre} activo={!row.fecha_baja} />,
    },
  ]

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <h1 className="text-[22px] font-extrabold tracking-tight text-ink">Ubicaciones</h1>
      <p className="mt-1 text-[13px] text-muted">
        Provincias y localidades de Argentina. Las inactivas se conservan como baja lógica y dejan de
        aparecer en los selectores.
      </p>

      {/* ─── Provincias ─────────────────────────────────────────── */}
      <h2 className="mt-8 text-[15px] font-bold text-ink">Provincias</h2>

      <div className="mt-3 rounded-xl border border-neutral-200 bg-surface p-6 shadow-card">
        <CrearProvinciaForm />
      </div>

      <div className="mt-4">
        <Table columns={provColumns} rows={provincias} rowKey={(row) => row.id} />
      </div>

      {/* ─── Localidades ────────────────────────────────────────── */}
      <h2 className="mt-10 text-[15px] font-bold text-ink">Localidades</h2>
      <p className="mt-1 text-[13px] text-muted">Elegí una provincia para ver y gestionar sus localidades.</p>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <FilterSelect
          paramKey="prov"
          options={provinciaOpts}
          ariaLabel="Elegí una provincia"
          className="w-full sm:w-64"
        />
        {provSeleccionada && (
          <>
            <SearchInput placeholder="Buscar localidad…" />
            <FilterSelect paramKey="estado" options={ESTADO_OPTS} ariaLabel="Filtrar por estado" className="w-full sm:w-44" />
            <ClearFilters keys={['q', 'estado']} />
          </>
        )}
      </div>

      {!provSeleccionada ? (
        <div className="mt-4">
          <EmptyState
            icon={<MapPinIcon size={22} />}
            title="Elegí una provincia"
            description="Seleccioná una provincia arriba para ver sus localidades."
          />
        </div>
      ) : (
        <>
          <div className="mt-4 rounded-xl border border-neutral-200 bg-surface p-6 shadow-card">
            <CrearLocalidadForm provinciaId={provSeleccionada} />
          </div>

          <div className="mt-4">
            {slice.length === 0 ? (
              <EmptyState
                icon={<MapPinIcon size={22} />}
                title="Sin resultados"
                description="No hay localidades que coincidan con los filtros aplicados."
              />
            ) : (
              <Table columns={locColumns} rows={slice} rowKey={(row) => row.id} />
            )}
          </div>

          <Paginador page={page} pageCount={pageCount} />
        </>
      )}
    </div>
  )
}
