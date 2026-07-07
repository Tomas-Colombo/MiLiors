import { getPostulantesAdmin } from '@/modules/admin/queries'
import { Table, Badge, EmptyState } from '@/components/ui'
import type { Column } from '@/components/ui'
import { CheckIcon, CloseIcon, UsersIcon } from '@/components/icons'
import { DesactivarPostulanteBtn } from './postulantes-acciones'
import { SearchInput, FilterSelect, ClearFilters, Paginador } from '@/components/shared/list-controls'
import { paginar } from '@/lib/pagination'

export const metadata = { title: 'Postulantes — Admin TalentID' }

const INFORME_OPTS = [
  { value: '', label: 'Informe: todos' },
  { value: 'LISTO', label: 'Informe listo' },
  { value: 'PENDIENTE', label: 'Informe pendiente' },
  { value: 'ERROR', label: 'Informe en error' },
  { value: 'sin', label: 'Sin informe' },
]

const BUSQUEDA_OPTS = [
  { value: '', label: 'Búsqueda: todos' },
  { value: 'si', label: 'En búsqueda' },
  { value: 'no', label: 'Fuera de búsqueda' },
]

type Postulante = {
  id: string
  nombre_completo: string
  email: string | null
  perfil_en_busqueda: boolean
  eneagrama_completo: boolean
  estado_informe: string | null
  created_at: string
}

function EstadoInformeBadge({ estado }: { estado: string | null }) {
  if (!estado) return <span className="text-[12px] text-neutral-400">Sin informe</span>
  const map: Record<string, 'success' | 'warning' | 'error'> = {
    LISTO: 'success',
    PENDIENTE: 'warning',
    ERROR: 'error',
  }
  return <Badge tone={map[estado] ?? 'neutral'}>{estado}</Badge>
}

export default async function PostulantesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; informe?: string; busqueda?: string; page?: string }>
}) {
  const sp = await searchParams
  const todos = await getPostulantesAdmin()

  const q = sp.q?.trim().toLowerCase() ?? ''
  const informe = sp.informe ?? ''
  const busqueda = sp.busqueda ?? ''

  const filtrados = todos.filter(p => {
    if (informe === 'sin' && p.estado_informe) return false
    if (informe && informe !== 'sin' && p.estado_informe !== informe) return false
    if (busqueda === 'si' && !p.perfil_en_busqueda) return false
    if (busqueda === 'no' && p.perfil_en_busqueda) return false
    if (q) {
      const enNombre = p.nombre_completo.toLowerCase().includes(q)
      const enEmail = p.email?.toLowerCase().includes(q) ?? false
      if (!enNombre && !enEmail) return false
    }
    return true
  })

  const { page, pageCount, slice } = paginar(filtrados, sp.page)

  const columns: Column<Postulante>[] = [
    {
      key: 'nombre',
      header: 'Nombre',
      width: '1.8fr',
      cell: row => (
        <div>
          <p className="font-medium text-ink leading-tight">{row.nombre_completo}</p>
          {row.email && <p className="break-words text-[11px] text-muted">{row.email}</p>}
        </div>
      ),
    },
    {
      key: 'eneagrama',
      header: 'Eneagrama',
      align: 'center',
      cell: row =>
        row.eneagrama_completo ? (
          <CheckIcon size={16} className="mx-auto text-success" />
        ) : (
          <CloseIcon size={16} className="mx-auto text-neutral-300" />
        ),
    },
    {
      key: 'informe',
      header: 'Informe',
      cell: row => <EstadoInformeBadge estado={row.estado_informe} />,
    },
    {
      key: 'busqueda',
      header: 'En búsqueda',
      align: 'center',
      cell: row =>
        row.perfil_en_busqueda ? (
          <CheckIcon size={16} className="mx-auto text-success" />
        ) : (
          <CloseIcon size={16} className="mx-auto text-neutral-300" />
        ),
    },
    {
      key: 'created_at',
      header: 'Registro',
      cell: row => (
        <span className="text-muted text-[12px]">
          {new Date(row.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </span>
      ),
    },
    {
      key: 'acciones',
      header: '',
      align: 'right',
      cell: row => <DesactivarPostulanteBtn id={row.id} activo={row.perfil_en_busqueda} />,
    },
  ]

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <h1 className="text-[22px] font-extrabold tracking-tight text-ink">Postulantes</h1>
      <p className="mt-1 text-[13px] text-muted">
        {todos.length} registros. Desactivar un perfil lo saca de búsquedas (baja lógica).
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput placeholder="Buscar por nombre o email…" />
        <FilterSelect paramKey="informe" options={INFORME_OPTS} ariaLabel="Filtrar por estado de informe" className="w-full sm:w-48" />
        <FilterSelect paramKey="busqueda" options={BUSQUEDA_OPTS} ariaLabel="Filtrar por estado de búsqueda" className="w-full sm:w-48" />
        <ClearFilters keys={['q', 'informe', 'busqueda']} />
        {filtrados.length !== todos.length && (
          <span className="whitespace-nowrap text-xs text-muted sm:ml-auto">
            {filtrados.length} de {todos.length}
          </span>
        )}
      </div>

      <div className="mt-4">
        {slice.length === 0 ? (
          <EmptyState
            icon={<UsersIcon size={22} />}
            title="Sin resultados"
            description="No hay postulantes que coincidan con los filtros aplicados."
          />
        ) : (
          <Table columns={columns} rows={slice} rowKey={row => row.id} />
        )}
      </div>

      <Paginador page={page} pageCount={pageCount} />
    </div>
  )
}
