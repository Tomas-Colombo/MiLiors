import {
  getCompetenciasAdmin,
  getCompetenciasUsoAdmin,
  type CompetenciaAdmin,
  type CompetenciaUsoAdmin,
} from '@/modules/admin/queries'
import { filtrarCatalogo, ordenarCatalogo, qsExportCatalogo } from '@/modules/admin/catalogo-filtros'
import { ExportarExcel } from '@/components/shared/exportar-excel'
import { Table, Badge, EmptyState } from '@/components/ui'
import type { Column } from '@/components/ui'
import { BarChartIcon } from '@/components/icons'
import { CrearCompetenciaForm, CompetenciaAcciones } from './competencias-ui'
import { SearchInput, FilterSelect, FiltroFechas, ClearFilters, Paginador } from '@/components/shared/list-controls'
import { paginar } from '@/lib/pagination'

export const metadata = { title: 'Habilidades/Tecnologías — Admin MiLiors' }

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

function pct(parte: number, total: number): number {
  return total === 0 ? 0 : Math.round((parte / total) * 100)
}

export default async function CompetenciasPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    estado?: string
    desde?: string
    hasta?: string
    orden?: string
    page?: string
    /** Paginador de la segunda tabla (uso por postulantes). */
    pageU?: string
  }>
}) {
  const sp = await searchParams
  const [todas, uso] = await Promise.all([getCompetenciasAdmin(), getCompetenciasUsoAdmin()])

  // Mismo filtrado y orden que usa la ruta del Excel: una sola implementación
  // para que lo que se descarga sea exactamente lo que se ve.
  const acc = {
    nombre: (c: CompetenciaAdmin) => c.nombre,
    activo: (c: CompetenciaAdmin) => !c.fecha_baja,
    createdAt: (c: CompetenciaAdmin) => c.created_at,
  }
  const filtradas = filtrarCatalogo(todas, sp, acc)
  const visibles = ordenarCatalogo(filtradas, sp.orden, acc)

  // El uso se filtra por nombre y estado, pero NO por fecha de alta del
  // catálogo: recortar por ahí escondaría habilidades viejas que se siguen
  // cargando, que es lo contrario de lo que esta tabla muestra.
  const usoVisible = filtrarCatalogo(
    uso,
    { q: sp.q, estado: sp.estado },
    {
      nombre: (u: CompetenciaUsoAdmin) => u.nombre,
      activo: (u: CompetenciaUsoAdmin) => u.activa,
      createdAt: (u: CompetenciaUsoAdmin) => u.createdAt,
    },
  )
  const { page: pageU, pageCount: pageCountU, slice: usoPagina } = paginar(usoVisible, sp.pageU)

  const { page, pageCount, slice } = paginar(visibles, sp.page)

  const columns: Column<CompetenciaAdmin>[] = [
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

  const usoColumns: Column<CompetenciaUsoAdmin>[] = [
    {
      key: 'nombre',
      header: 'Habilidad / tecnología',
      width: '2fr',
      cell: row => (
        <div>
          <p className="font-medium text-ink leading-tight">{row.nombre}</p>
          {!row.activa && <p className="text-[11px] text-warning">Dada de baja, todavía en uso</p>}
        </div>
      ),
    },
    {
      key: 'postulantes',
      header: 'Postulantes',
      align: 'right',
      cell: row => (
        <span className="text-[13px] font-semibold tabular-nums text-ink-soft">{row.postulantes}</span>
      ),
    },
    {
      key: 'niveles',
      header: 'Nivel declarado',
      width: '1.5fr',
      cell: row => (
        <div className="w-full space-y-1">
          <span className="flex h-2 w-full overflow-hidden rounded-full bg-neutral-100" aria-hidden>
            <span className="bg-neutral-300" style={{ width: `${pct(row.basico, row.postulantes)}%` }} />
            <span className="bg-primary-500" style={{ width: `${pct(row.intermedio, row.postulantes)}%` }} />
            <span className="bg-emerald-500" style={{ width: `${pct(row.avanzado, row.postulantes)}%` }} />
          </span>
          <p className="text-[11px] text-muted">
            {row.basico} básico · {row.intermedio} intermedio · {row.avanzado} avanzado
          </p>
        </div>
      ),
    },
    {
      key: 'alta',
      header: 'Alta en catálogo',
      cell: row => (
        <span className="text-muted">
          {new Date(row.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </span>
      ),
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
        <ExportarExcel
          href={`/api/admin/catalogos/export?${qsExportCatalogo('competencias', sp)}`}
          nota="Dos hojas: catálogo y uso por postulantes, con los filtros aplicados."
        />
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

      {/* ─── Uso real por postulantes ─────────────────────────────── */}
      <h2 className="mt-10 text-[15px] font-bold text-ink">Cargadas por postulantes</h2>
      <p className="mt-1 text-[13px] text-muted">
        Qué habilidades cargan efectivamente los postulantes y con qué nivel. No hay forma de saber
        si una habilidad la creó un admin o un postulante — el texto libre se da de alta en este
        mismo catálogo —, pero una con mucho uso y alta reciente casi siempre la trajo alguien
        escribiéndola a mano. La búsqueda y el filtro de estado también la alcanzan.
      </p>

      <div className="mt-4">
        {usoPagina.length === 0 ? (
          <EmptyState
            icon={<BarChartIcon size={22} />}
            title="Sin resultados"
            description="Ningún postulante cargó habilidades que coincidan con los filtros aplicados."
          />
        ) : (
          <Table columns={usoColumns} rows={usoPagina} rowKey={row => row.id} />
        )}
      </div>

      <Paginador page={pageU} pageCount={pageCountU} paramKey="pageU" />
    </div>
  )
}
