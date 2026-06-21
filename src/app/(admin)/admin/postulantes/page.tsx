import { getPostulantesAdmin } from '@/modules/admin/queries'
import { Table, Badge } from '@/components/ui'
import type { Column } from '@/components/ui'
import { CheckIcon, CloseIcon } from '@/components/icons'
import { DesactivarPostulanteBtn } from './postulantes-acciones'

export const metadata = { title: 'Postulantes — Admin TalentID' }

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

export default async function PostulantesPage() {
  const postulantes = await getPostulantesAdmin()

  const columns: Column<Postulante>[] = [
    {
      key: 'nombre',
      header: 'Nombre',
      width: '1.8fr',
      cell: row => (
        <div>
          <p className="font-medium text-ink leading-tight">{row.nombre_completo}</p>
          {row.email && <p className="text-[11px] text-muted">{row.email}</p>}
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
        {postulantes.length} registros. Desactivar un perfil lo saca de búsquedas (baja lógica).
      </p>

      <div className="mt-8">
        <Table
          columns={columns}
          rows={postulantes}
          rowKey={row => row.id}
        />
      </div>
    </div>
  )
}
