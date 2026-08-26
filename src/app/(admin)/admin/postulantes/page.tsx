import { getPostulantesAdmin } from '@/modules/admin/queries'
import { getProvincias, getDepartamentosPorProvincia } from '@/modules/ubicacion/queries'
import { getCarreras } from '@/modules/carreras/queries'
import { Table, Badge, EmptyState } from '@/components/ui'
import type { Column } from '@/components/ui'
import { CheckIcon, CloseIcon, UsersIcon } from '@/components/icons'
import { DesactivarPostulanteBtn } from './postulantes-acciones'
import {
  SearchInput,
  FilterSelect,
  FilterSearchableSelect,
  FiltroFechas,
  ClearFilters,
  Paginador,
} from '@/components/shared/list-controls'
import { paginar } from '@/lib/pagination'

export const metadata = { title: 'Postulantes — Admin MiLiors' }

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

const ENEAGRAMA_OPTS = [
  { value: '', label: 'Eneagrama: todos' },
  { value: 'si', label: 'Eneagrama completo' },
  { value: 'no', label: 'Eneagrama incompleto' },
]

const ORDEN_OPTS = [
  { value: '', label: 'Registro: más reciente' },
  { value: 'registro_asc', label: 'Registro: más antiguo' },
  { value: 'nombre', label: 'Nombre (A–Z)' },
  { value: 'nombre_desc', label: 'Nombre (Z–A)' },
]

/** Las carreras cargadas a mano no tienen id: se filtran con este centinela. */
const CARRERA_OTRAS = 'OTRAS'

const FILTRO_KEYS = [
  'q',
  'informe',
  'busqueda',
  'eneagrama',
  'carrera',
  'provincia',
  'departamento',
  'desde',
  'hasta',
  'orden',
]

type Postulante = {
  id: string
  nombre_completo: string
  email: string | null
  perfil_en_busqueda: boolean
  eneagrama_completo: boolean
  estado_informe: string | null
  created_at: string
  carrera: string | null
  nombre_localidad: string | null
  nombre_provincia: string | null
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
  searchParams: Promise<{
    q?: string
    informe?: string
    busqueda?: string
    eneagrama?: string
    carrera?: string
    provincia?: string
    departamento?: string
    desde?: string
    hasta?: string
    orden?: string
    page?: string
  }>
}) {
  const sp = await searchParams
  const [todos, provincias, departamentos, carreras] = await Promise.all([
    getPostulantesAdmin(),
    getProvincias(),
    sp.provincia ? getDepartamentosPorProvincia(sp.provincia) : Promise.resolve([]),
    getCarreras(),
  ])

  const q = sp.q?.trim().toLowerCase() ?? ''
  const informe = sp.informe ?? ''
  const busqueda = sp.busqueda ?? ''
  const eneagrama = sp.eneagrama ?? ''
  const carrera = sp.carrera ?? ''
  const provincia = sp.provincia ?? ''
  const departamento = sp.departamento ?? ''
  const desde = sp.desde ?? ''
  // El rango es inclusive: `hasta` corta al final del día elegido.
  const hasta = sp.hasta ? `${sp.hasta}T23:59:59.999Z` : ''

  const filtrados = todos.filter(p => {
    if (informe === 'sin' && p.estado_informe) return false
    if (informe && informe !== 'sin' && p.estado_informe !== informe) return false
    if (busqueda === 'si' && !p.perfil_en_busqueda) return false
    if (busqueda === 'no' && p.perfil_en_busqueda) return false
    if (eneagrama === 'si' && !p.eneagrama_completo) return false
    if (eneagrama === 'no' && p.eneagrama_completo) return false
    if (carrera === CARRERA_OTRAS && !p.es_carrera_otra) return false
    if (carrera && carrera !== CARRERA_OTRAS && p.carrera_id !== carrera) return false
    if (provincia && p.provincia_id !== provincia) return false
    if (departamento && p.departamento_id !== departamento) return false
    if (desde && p.created_at < desde) return false
    if (hasta && p.created_at > hasta) return false
    if (q) {
      const enNombre = p.nombre_completo.toLowerCase().includes(q)
      const enEmail = p.email?.toLowerCase().includes(q) ?? false
      if (!enNombre && !enEmail) return false
    }
    return true
  })

  // La query ya viene por created_at desc; el resto de los órdenes se aplica acá.
  const orden = sp.orden ?? ''
  const visibles =
    orden === ''
      ? filtrados
      : [...filtrados].sort((a, b) => {
          if (orden === 'registro_asc') return a.created_at.localeCompare(b.created_at)
          const cmp = a.nombre_completo.localeCompare(b.nombre_completo, 'es')
          return orden === 'nombre_desc' ? -cmp : cmp
        })

  const { page, pageCount, slice } = paginar(visibles, sp.page)

  const carreraOpts = [...carreras, { value: CARRERA_OTRAS, label: 'Carrera cargada a mano' }]
  const provinciaOpts = provincias.map(p => ({ value: p.id, label: p.nombre }))

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
      key: 'carrera',
      header: 'Carrera',
      cell: row =>
        row.carrera ? (
          <span className="text-[12.5px] text-ink-soft">{row.carrera}</span>
        ) : (
          <span className="text-[12px] text-neutral-400">—</span>
        ),
    },
    {
      key: 'ubicacion',
      header: 'Ubicación',
      cell: row =>
        row.nombre_localidad || row.nombre_provincia ? (
          <span className="text-[12.5px] text-muted">
            {[row.nombre_localidad, row.nombre_provincia].filter(Boolean).join(', ')}
          </span>
        ) : (
          <span className="text-[12px] text-neutral-400">—</span>
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
    <div className="mx-auto max-w-6xl px-8 py-10">
      <h1 className="text-[22px] font-extrabold tracking-tight text-ink">Postulantes</h1>
      <p className="mt-1 text-[13px] text-muted">
        {todos.length} registros. Desactivar un perfil lo saca de búsquedas (baja lógica).
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput placeholder="Buscar por nombre o email…" />
        <FilterSelect paramKey="informe" options={INFORME_OPTS} ariaLabel="Filtrar por estado de informe" className="w-full sm:w-48" />
        <FilterSelect paramKey="busqueda" options={BUSQUEDA_OPTS} ariaLabel="Filtrar por estado de búsqueda" className="w-full sm:w-48" />
        <FilterSelect paramKey="eneagrama" options={ENEAGRAMA_OPTS} ariaLabel="Filtrar por eneagrama" className="w-full sm:w-48" />
        <FilterSearchableSelect paramKey="carrera" options={carreraOpts} placeholder="Todas las carreras" />
        <FilterSearchableSelect
          paramKey="provincia"
          options={provinciaOpts}
          placeholder="Todas las provincias"
          alsoClear={['departamento']}
        />
        {/* El departamento sólo tiene sentido una vez elegida la provincia. */}
        {provincia && (
          <FilterSearchableSelect
            paramKey="departamento"
            options={departamentos}
            placeholder="Todos los departamentos"
            hint="Alcanza a quienes cargaron su localidad."
          />
        )}
        <FilterSelect paramKey="orden" options={ORDEN_OPTS} ariaLabel="Ordenar postulantes" className="w-full sm:w-48" />
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <FiltroFechas label="fecha de registro" />
        <div className="flex items-center gap-3 sm:pb-1">
          <ClearFilters keys={FILTRO_KEYS} />
          {visibles.length !== todos.length && (
            <span className="whitespace-nowrap text-xs text-muted">
              {visibles.length} de {todos.length}
            </span>
          )}
        </div>
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
