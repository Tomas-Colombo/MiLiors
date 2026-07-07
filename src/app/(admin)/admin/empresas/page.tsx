import { getEmpresasAdmin } from '@/modules/admin/queries'
import { Table, Badge, EmptyState } from '@/components/ui'
import type { Column } from '@/components/ui'
import { BuildingIcon } from '@/components/icons'
import { SearchInput, FilterSelect, ClearFilters, Paginador } from '@/components/shared/list-controls'
import { paginar } from '@/lib/pagination'

export const metadata = { title: 'Empresas — Admin TalentID' }

type Empresa = {
  id: string
  nombre_empresa: string
  descripcion: string | null
  activa: boolean
  created_at: string
  reclutadores: { id: string; nombre: string; email: string | null }[]
}

const ESTADO_OPTS = [
  { value: '', label: 'Todos los estados' },
  { value: 'activa', label: 'Activas' },
  { value: 'baja', label: 'De baja' },
]

export default async function EmpresasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; page?: string }>
}) {
  const sp = await searchParams
  const todas = await getEmpresasAdmin()

  const q = sp.q?.trim().toLowerCase() ?? ''
  const estado = sp.estado ?? ''

  const filtradas = todas.filter(e => {
    if (estado === 'activa' && !e.activa) return false
    if (estado === 'baja' && e.activa) return false
    if (q) {
      const enNombre = e.nombre_empresa.toLowerCase().includes(q)
      const enReclutador = e.reclutadores.some(
        r => r.nombre.toLowerCase().includes(q) || (r.email?.toLowerCase().includes(q) ?? false),
      )
      if (!enNombre && !enReclutador) return false
    }
    return true
  })

  const { page, pageCount, slice } = paginar(filtradas, sp.page)

  const columns: Column<Empresa>[] = [
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

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput placeholder="Buscar empresa o reclutador…" />
        <FilterSelect paramKey="estado" options={ESTADO_OPTS} ariaLabel="Filtrar por estado" className="w-full sm:w-44" />
        <ClearFilters keys={['q', 'estado']} />
        {filtradas.length !== todas.length && (
          <span className="whitespace-nowrap text-xs text-muted sm:ml-auto">
            {filtradas.length} de {todas.length}
          </span>
        )}
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
