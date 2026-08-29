import { getProvinciasAdmin, getDepartamentosAdmin, getLocalidadesAdmin } from '@/modules/admin/queries'
import type { ProvinciaAdmin, DepartamentoAdmin, LocalidadAdmin } from '@/modules/admin/queries'
import { Table, Badge, EmptyState } from '@/components/ui'
import type { Column } from '@/components/ui'
import { MapPinIcon } from '@/components/icons'
import {
  CrearProvinciaForm,
  ProvinciaAcciones,
  CrearDepartamentoForm,
  DepartamentoAcciones,
  CrearLocalidadForm,
  LocalidadAcciones,
} from './ubicaciones-ui'
import {
  SearchInput,
  FilterSelect,
  FilterSearchableSelect,
  ClearFilters,
  Paginador,
} from '@/components/shared/list-controls'
import { paginar } from '@/lib/pagination'
import { normalizarTexto } from '@/lib/texto'

export const metadata = { title: 'Ubicaciones — Admin MiLiors' }

const ESTADO_OPTS = [
  { value: '', label: 'Todos los estados' },
  { value: 'activo', label: 'Activos' },
  { value: 'inactivo', label: 'Inactivos' },
]

const ORDEN_OPTS = [
  { value: '', label: 'Nombre (A–Z)' },
  { value: 'nombre_desc', label: 'Nombre (Z–A)' },
  { value: 'alta_desc', label: 'Alta: más reciente' },
  { value: 'alta_asc', label: 'Alta: más antigua' },
]

type FilaCatalogo = { nombre: string; fecha_baja: string | null; created_at: string }

/** Mismo filtrado para los tres niveles: son el mismo tipo de catálogo. */
function filtrar<T extends FilaCatalogo>(rows: T[], q: string, estado: string): T[] {
  return rows.filter((row) => {
    if (estado === 'activo' && row.fecha_baja) return false
    if (estado === 'inactivo' && !row.fecha_baja) return false
    if (q && !normalizarTexto(row.nombre).includes(q)) return false
    return true
  })
}

/** Las queries ya vienen alfabéticas; el resto de los órdenes se aplica acá. */
function ordenar<T extends FilaCatalogo>(rows: T[], orden: string): T[] {
  if (!orden) return rows
  return [...rows].sort((a, b) => {
    if (orden === 'alta_desc') return b.created_at.localeCompare(a.created_at)
    if (orden === 'alta_asc') return a.created_at.localeCompare(b.created_at)
    return -a.nombre.localeCompare(b.nombre, 'es')
  })
}

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

/** Contador "N de M", sólo cuando el filtro recorta algo. */
function Contador({ visibles, total }: { visibles: number; total: number }) {
  if (visibles === total) return null
  return (
    <span className="whitespace-nowrap text-xs text-muted sm:ml-auto">
      {visibles} de {total}
    </span>
  )
}

export default async function UbicacionesPage({
  searchParams,
}: {
  searchParams: Promise<{
    // Provincias
    qP?: string; estadoP?: string; ordenP?: string; pageP?: string
    // Departamentos (de la provincia elegida)
    prov?: string; qD?: string; estadoD?: string; ordenD?: string; pageD?: string
    // Localidades (del departamento elegido)
    dep?: string; qL?: string; estadoL?: string; ordenL?: string; pageL?: string
  }>
}) {
  const sp = await searchParams

  // ─── Provincias ──────────────────────────────────────────────────────────
  const provincias = await getProvinciasAdmin()
  const provFiltradas = ordenar(
    filtrar(provincias, normalizarTexto(sp.qP ?? ''), sp.estadoP ?? ''),
    sp.ordenP ?? '',
  )
  const { page: pageP, pageCount: pageCountP, slice: sliceP } = paginar(provFiltradas, sp.pageP)

  // ─── Departamentos ───────────────────────────────────────────────────────
  const provSeleccionada = sp.prov ?? ''
  const departamentos = provSeleccionada ? await getDepartamentosAdmin(provSeleccionada) : []
  const depFiltrados = ordenar(
    filtrar(departamentos, normalizarTexto(sp.qD ?? ''), sp.estadoD ?? ''),
    sp.ordenD ?? '',
  )
  const { page: pageD, pageCount: pageCountD, slice: sliceD } = paginar(depFiltrados, sp.pageD)

  // ─── Localidades ─────────────────────────────────────────────────────────
  // El departamento elegido tiene que pertenecer a la provincia elegida: si se
  // cambia la provincia, el `dep` viejo queda huérfano y se ignora.
  const depSeleccionado = departamentos.some((d) => d.id === sp.dep) ? (sp.dep as string) : ''
  const localidades = depSeleccionado ? await getLocalidadesAdmin(depSeleccionado) : []
  const locFiltradas = ordenar(
    filtrar(localidades, normalizarTexto(sp.qL ?? ''), sp.estadoL ?? ''),
    sp.ordenL ?? '',
  )
  const { page: pageL, pageCount: pageCountL, slice: sliceL } = paginar(locFiltradas, sp.pageL)

  const provinciaOpts = provincias.map((p) => ({
    value: p.id,
    label: p.fecha_baja ? `${p.nombre} (inactiva)` : p.nombre,
  }))

  const departamentoOpts = departamentos.map((d) => ({
    value: d.id,
    label: d.fecha_baja ? `${d.nombre} (inactivo)` : d.nombre,
  }))

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

  const depColumns: Column<DepartamentoAdmin>[] = [
    {
      key: 'nombre',
      header: 'Departamento',
      width: '2fr',
      cell: (row) => <span className="font-medium text-ink">{row.nombre}</span>,
    },
    { key: 'estado', header: 'Estado', cell: estadoCell },
    { key: 'created_at', header: 'Creado', cell: (row) => fechaCell(row.created_at) },
    {
      key: 'acciones',
      header: '',
      align: 'right',
      cell: (row) => <DepartamentoAcciones id={row.id} nombre={row.nombre} activo={!row.fecha_baja} />,
    },
  ]

  const locColumns: Column<LocalidadAdmin>[] = [
    {
      key: 'nombre',
      header: 'Localidad',
      width: '2fr',
      cell: (row) => <span className="font-medium text-ink">{row.nombre}</span>,
    },
    { key: 'estado', header: 'Estado', cell: estadoCell },
    { key: 'created_at', header: 'Creada', cell: (row) => fechaCell(row.created_at) },
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
        Provincias, departamentos y localidades de Argentina. Cada nivel cuelga del anterior. Los
        inactivos se conservan como baja lógica y dejan de aparecer en los selectores.
      </p>

      {/* ─── Provincias ─────────────────────────────────────────── */}
      <h2 className="mt-8 text-[15px] font-bold text-ink">Provincias</h2>

      <div className="mt-3 rounded-xl border border-neutral-200 bg-surface p-6 shadow-card">
        <CrearProvinciaForm />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput paramKey="qP" placeholder="Buscar provincia…" />
        <FilterSelect paramKey="estadoP" options={ESTADO_OPTS} ariaLabel="Filtrar provincias por estado" className="w-full sm:w-44" />
        <FilterSelect paramKey="ordenP" options={ORDEN_OPTS} ariaLabel="Ordenar provincias" className="w-full sm:w-48" />
        <ClearFilters keys={['qP', 'estadoP', 'ordenP']} />
        <Contador visibles={provFiltradas.length} total={provincias.length} />
      </div>

      <div className="mt-4">
        {sliceP.length === 0 ? (
          <EmptyState
            icon={<MapPinIcon size={22} />}
            title="Sin resultados"
            description="No hay provincias que coincidan con los filtros aplicados."
          />
        ) : (
          <Table columns={provColumns} rows={sliceP} rowKey={(row) => row.id} />
        )}
      </div>

      <Paginador page={pageP} pageCount={pageCountP} paramKey="pageP" />

      {/* ─── Departamentos ──────────────────────────────────────── */}
      <h2 className="mt-10 text-[15px] font-bold text-ink">Departamentos</h2>
      <p className="mt-1 text-[13px] text-muted">Elegí una provincia para ver y gestionar sus departamentos.</p>

      <div className="mt-3">
        <FilterSearchableSelect
          paramKey="prov"
          options={provinciaOpts}
          placeholder="Elegí una provincia…"
          className="w-full sm:w-64"
          alsoClear={['dep', 'qD', 'estadoD', 'ordenD', 'pageD', 'qL', 'estadoL', 'ordenL', 'pageL']}
        />
      </div>

      {!provSeleccionada ? (
        <div className="mt-4">
          <EmptyState
            icon={<MapPinIcon size={22} />}
            title="Elegí una provincia"
            description="Seleccioná una provincia arriba para ver sus departamentos."
          />
        </div>
      ) : (
        <>
          <div className="mt-4 rounded-xl border border-neutral-200 bg-surface p-6 shadow-card">
            <CrearDepartamentoForm provinciaId={provSeleccionada} />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput paramKey="qD" placeholder="Buscar departamento…" />
            <FilterSelect paramKey="estadoD" options={ESTADO_OPTS} ariaLabel="Filtrar departamentos por estado" className="w-full sm:w-44" />
            <FilterSelect paramKey="ordenD" options={ORDEN_OPTS} ariaLabel="Ordenar departamentos" className="w-full sm:w-48" />
            <ClearFilters keys={['qD', 'estadoD', 'ordenD']} />
            <Contador visibles={depFiltrados.length} total={departamentos.length} />
          </div>

          <div className="mt-4">
            {sliceD.length === 0 ? (
              <EmptyState
                icon={<MapPinIcon size={22} />}
                title="Sin resultados"
                description="No hay departamentos que coincidan con los filtros aplicados."
              />
            ) : (
              <Table columns={depColumns} rows={sliceD} rowKey={(row) => row.id} />
            )}
          </div>

          <Paginador page={pageD} pageCount={pageCountD} paramKey="pageD" />
        </>
      )}

      {/* ─── Localidades ────────────────────────────────────────── */}
      <h2 className="mt-10 text-[15px] font-bold text-ink">Localidades</h2>
      <p className="mt-1 text-[13px] text-muted">Elegí un departamento para ver y gestionar sus localidades.</p>

      <div className="mt-3">
        <FilterSearchableSelect
          paramKey="dep"
          options={departamentoOpts}
          placeholder={provSeleccionada ? 'Elegí un departamento…' : 'Elegí primero una provincia'}
          className="w-full sm:w-64"
          alsoClear={['qL', 'estadoL', 'ordenL', 'pageL']}
        />
      </div>

      {!depSeleccionado ? (
        <div className="mt-4">
          <EmptyState
            icon={<MapPinIcon size={22} />}
            title="Elegí un departamento"
            description={
              provSeleccionada
                ? 'Seleccioná un departamento arriba para ver sus localidades.'
                : 'Elegí primero una provincia y después uno de sus departamentos.'
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-4 rounded-xl border border-neutral-200 bg-surface p-6 shadow-card">
            <CrearLocalidadForm departamentoId={depSeleccionado} />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput paramKey="qL" placeholder="Buscar localidad…" />
            <FilterSelect paramKey="estadoL" options={ESTADO_OPTS} ariaLabel="Filtrar localidades por estado" className="w-full sm:w-44" />
            <FilterSelect paramKey="ordenL" options={ORDEN_OPTS} ariaLabel="Ordenar localidades" className="w-full sm:w-48" />
            <ClearFilters keys={['qL', 'estadoL', 'ordenL']} />
            <Contador visibles={locFiltradas.length} total={localidades.length} />
          </div>

          <div className="mt-4">
            {sliceL.length === 0 ? (
              <EmptyState
                icon={<MapPinIcon size={22} />}
                title="Sin resultados"
                description="No hay localidades que coincidan con los filtros aplicados."
              />
            ) : (
              <Table columns={locColumns} rows={sliceL} rowKey={(row) => row.id} />
            )}
          </div>

          <Paginador page={pageL} pageCount={pageCountL} paramKey="pageL" />
        </>
      )}
    </div>
  )
}
