import { getEmpresasAdmin, type EmpresaAdmin } from '@/modules/admin/queries'
import { filtrarCatalogo, ordenarCatalogo, qsExportCatalogo } from '@/modules/admin/catalogo-filtros'
import { ExportarExcel } from '@/components/shared/exportar-excel'
import { getConfiguracionSistema } from '@/modules/configuracion/queries'
import { Table, Badge, EmptyState } from '@/components/ui'
import type { Column } from '@/components/ui'
import { BuildingIcon } from '@/components/icons'
import { SearchInput, FilterSelect, FiltroFechas, ClearFilters, Paginador } from '@/components/shared/list-controls'
import { paginar } from '@/lib/pagination'
import { ConfigInactividad } from './config-inactividad'

export const metadata = { title: 'Empresas — Admin MiLiors' }

const ESTADO_OPTS = [
  { value: '', label: 'Todos los estados' },
  { value: 'activa', label: 'Activas' },
  { value: 'baja', label: 'De baja' },
]

const ORDEN_OPTS = [
  { value: '', label: 'Alta: más reciente' },
  { value: 'antiguas', label: 'Alta: más antigua' },
  { value: 'nombre', label: 'Nombre (A–Z)' },
  { value: 'nombre_desc', label: 'Nombre (Z–A)' },
]

const RECLUTADORES_OPTS = [
  { value: '', label: 'Reclutadores: todas' },
  { value: 'con', label: 'Con reclutadores' },
  { value: 'sin', label: 'Sin reclutadores' },
]

const FILTRO_KEYS = ['q', 'estado', 'reclutadores', 'desde', 'hasta', 'orden']

export default async function EmpresasPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    estado?: string
    reclutadores?: string
    desde?: string
    hasta?: string
    orden?: string
    page?: string
  }>
}) {
  const sp = await searchParams
  const [todas, { diasInactividadCierre }] = await Promise.all([
    getEmpresasAdmin(),
    getConfiguracionSistema(),
  ])

  // Mismo filtrado y orden que usa la ruta del Excel: una sola implementación
  // para que lo que se descarga sea exactamente lo que se ve.
  const acc = {
    nombre: (e: EmpresaAdmin) => e.nombre_empresa,
    activo: (e: EmpresaAdmin) => e.activa,
    createdAt: (e: EmpresaAdmin) => e.created_at,
    buscarTambienEn: (e: EmpresaAdmin) => e.reclutadores.flatMap(r => [r.nombre, r.email ?? '']),
  }
  const reclutadores = sp.reclutadores ?? ''
  let filtradas = filtrarCatalogo(todas, sp, acc)
  if (reclutadores === 'con') filtradas = filtradas.filter(e => e.reclutadores.length > 0)
  if (reclutadores === 'sin') filtradas = filtradas.filter(e => e.reclutadores.length === 0)

  const visibles = ordenarCatalogo(filtradas, sp.orden, acc)

  const { page, pageCount, slice } = paginar(visibles, sp.page)

  const columns: Column<EmpresaAdmin>[] = [
    {
      key: 'nombre',
      header: 'Empresa',
      width: '2fr',
      cell: row => (
        <div>
          <p className="font-medium text-ink leading-tight">{row.nombre_empresa}</p>
          {row.descripcion && (
            <p className="text-[11px] text-muted line-clamp-1">{row.descripcion}</p>
          )}
        </div>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      cell: row =>
        row.activa ? (
          <Badge tone="success" dot>Activa</Badge>
        ) : (
          <Badge tone="neutral" dot>Baja</Badge>
        ),
    },
    {
      key: 'reclutadores',
      header: 'Reclutadores',
      cell: row => (
        <div className="min-w-0 space-y-0.5">
          {row.reclutadores.length === 0 ? (
            <span className="text-[12px] text-neutral-400">Sin reclutadores</span>
          ) : (
            row.reclutadores.map(rec => (
              <div key={rec.id} className="min-w-0">
                <p className="break-words text-[12.5px] font-medium text-ink-soft leading-tight">{rec.nombre}</p>
                {rec.email && rec.email !== rec.nombre && (
                  <p className="break-words text-[11px] text-muted">{rec.email}</p>
                )}
              </div>
            ))
          )}
        </div>
      ),
    },
    {
      key: 'created_at',
      header: 'Creada',
      cell: row => (
        <span className="text-muted text-[12px]">
          {new Date(row.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </span>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <h1 className="text-[22px] font-extrabold tracking-tight text-ink">Empresas</h1>
      <p className="mt-1 text-[13px] text-muted">
        {todas.length} empresas registradas. Vista de solo lectura en MVP.
      </p>

      <div className="mt-6">
        <ConfigInactividad diasActual={diasInactividadCierre} />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput placeholder="Buscar empresa o reclutador…" />
        <FilterSelect paramKey="estado" options={ESTADO_OPTS} ariaLabel="Filtrar por estado" className="w-full sm:w-44" />
        <FilterSelect paramKey="reclutadores" options={RECLUTADORES_OPTS} ariaLabel="Filtrar por reclutadores" className="w-full sm:w-52" />
        <FilterSelect paramKey="orden" options={ORDEN_OPTS} ariaLabel="Ordenar empresas" className="w-full sm:w-48" />
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
        <ExportarExcel
          href={`/api/admin/catalogos/export?${qsExportCatalogo('empresas', sp)}`}
          nota="Incluye reclutadores y emails, con los filtros aplicados."
        />
      </div>

      <div className="mt-4">
        {slice.length === 0 ? (
          <EmptyState
            icon={<BuildingIcon size={22} />}
            title="Sin resultados"
            description="No hay empresas que coincidan con los filtros aplicados."
          />
        ) : (
          <Table columns={columns} rows={slice} rowKey={row => row.id} />
        )}
      </div>

      <Paginador page={page} pageCount={pageCount} />
    </div>
  )
}
