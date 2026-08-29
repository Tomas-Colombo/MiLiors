import { getInformesAdmin } from '@/modules/admin/queries'
import { Table, Badge, EmptyState } from '@/components/ui'
import type { Column } from '@/components/ui'
import { FileIcon } from '@/components/icons'
import {
  SearchInput,
  FilterSelect,
  FiltroFechas,
  ClearFilters,
  Paginador,
} from '@/components/shared/list-controls'
import { paginar } from '@/lib/pagination'
import { normalizarTexto } from '@/lib/texto'

export const metadata = { title: 'Informes — Admin MiLiors' }

type SearchParams = Promise<{
  q?: string
  orden?: string
  estado?: string
  desde?: string
  hasta?: string
  page?: string
}>

const ESTADO_OPTS = [
  { value: '', label: 'Todos los estados' },
  { value: 'LISTO', label: 'Listos' },
  { value: 'PENDIENTE', label: 'Pendientes' },
  { value: 'ERROR', label: 'En error' },
]

const ORDEN_OPTS = [
  { value: '', label: 'Actualización: más reciente' },
  { value: 'actualizacion_asc', label: 'Actualización: más antigua' },
  { value: 'generado_desc', label: 'Generación: más reciente' },
  { value: 'generado_asc', label: 'Generación: más antigua' },
  { value: 'participante_az', label: 'Participante (A–Z)' },
  { value: 'participante_za', label: 'Participante (Z–A)' },
]

const FILTRO_KEYS = ['q', 'estado', 'desde', 'hasta', 'orden']

type InformeRow = {
  id: string
  estado_informe: string
  fecha_generacion: string
  updated_at: string
  nombre_completo: string
  email: string | null
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, 'success' | 'warning' | 'error'> = {
    LISTO: 'success',
    PENDIENTE: 'warning',
    ERROR: 'error',
  }
  return <Badge tone={map[estado] ?? 'neutral'} dot>{estado}</Badge>
}

function ordenar(rows: InformeRow[], orden: string | undefined): InformeRow[] {
  const arr = [...rows]
  switch (orden) {
    case 'actualizacion_asc':
      return arr.sort((a, b) => a.updated_at.localeCompare(b.updated_at))
    case 'generado_desc':
      return arr.sort((a, b) => (b.fecha_generacion ?? '').localeCompare(a.fecha_generacion ?? ''))
    case 'generado_asc':
      return arr.sort((a, b) => (a.fecha_generacion ?? '').localeCompare(b.fecha_generacion ?? ''))
    case 'participante_az':
      return arr.sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo, 'es'))
    case 'participante_za':
      return arr.sort((a, b) => b.nombre_completo.localeCompare(a.nombre_completo, 'es'))
    default: // 'actualizacion_desc' (más reciente)
      return arr.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  }
}

export default async function InformesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams
  const todos = await getInformesAdmin()

  const q = normalizarTexto(sp.q ?? '')
  const estado = sp.estado ?? ''
  const desde = sp.desde ?? ''
  // El rango es inclusive: `hasta` corta al final del día elegido. Se aplica
  // sobre la fecha de generación, que es la que se ordena y se muestra.
  const hasta = sp.hasta ? `${sp.hasta}T23:59:59.999Z` : ''

  const filtrados = todos.filter(row => {
    if (estado && row.estado_informe !== estado) return false
    if (desde && (!row.fecha_generacion || row.fecha_generacion < desde)) return false
    if (hasta && (!row.fecha_generacion || row.fecha_generacion > hasta)) return false
    if (q) {
      const enNombre = normalizarTexto(row.nombre_completo).includes(q)
      const enEmail = row.email ? normalizarTexto(row.email).includes(q) : false
      if (!enNombre && !enEmail) return false
    }
    return true
  })

  const informes = ordenar(filtrados, sp.orden)
  const { page, pageCount, slice } = paginar(informes, sp.page)

  const columns: Column<InformeRow>[] = [
    {
      key: 'postulante',
      header: 'Postulante',
      width: '2fr',
      cell: row => (
        <div>
          <p className="font-medium text-ink leading-tight">{row.nombre_completo}</p>
          {row.email && <p className="break-words text-[11px] text-muted">{row.email}</p>}
        </div>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      cell: row => <EstadoBadge estado={row.estado_informe} />,
    },
    {
      key: 'fecha_generacion',
      header: 'Generado',
      cell: row => (
        <span className="text-muted text-[12px]">
          {row.fecha_generacion
            ? new Date(row.fecha_generacion).toLocaleDateString('es-AR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })
            : '—'}
        </span>
      ),
    },
    {
      key: 'updated_at',
      header: 'Últ. actualización',
      cell: row => (
        <span className="text-muted text-[12px]">
          {new Date(row.updated_at).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      ),
    },
  ]

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <h1 className="text-[22px] font-extrabold tracking-tight text-ink">Monitor de informes</h1>
      <p className="mt-1 text-[13px] text-muted">
        {todos.length} informes en total. Filtrá y ordená para encontrar los que buscás.
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput placeholder="Buscar por participante…" />
        <FilterSelect paramKey="estado" options={ESTADO_OPTS} ariaLabel="Filtrar por estado" className="w-full sm:w-44" />
        <FilterSelect paramKey="orden" options={ORDEN_OPTS} ariaLabel="Ordenar informes" className="w-full sm:w-56" />
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <FiltroFechas label="fecha de generación" />
        <div className="flex items-center gap-3 sm:pb-1">
          <ClearFilters keys={FILTRO_KEYS} />
          {informes.length !== todos.length && (
            <span className="whitespace-nowrap text-xs text-muted">
              {informes.length} de {todos.length}
            </span>
          )}
        </div>
      </div>

      <div className="mt-6">
        {informes.length === 0 ? (
          <EmptyState
            icon={<FileIcon size={22} />}
            title="Sin resultados"
            description="No hay informes que coincidan con los filtros aplicados."
          />
        ) : (
          <>
            <Table
              columns={columns}
              rows={slice}
              rowKey={row => row.id}
            />
            <Paginador page={page} pageCount={pageCount} />
          </>
        )}
      </div>
    </div>
  )
}
