import { getInformesAdmin } from '@/modules/admin/queries'
import { Table, Badge } from '@/components/ui'
import type { Column } from '@/components/ui'

export const metadata = { title: 'Informes — Admin TalentID' }

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

export default async function InformesPage() {
  const informes = await getInformesAdmin()

  const columns: Column<InformeRow>[] = [
    {
      key: 'postulante',
      header: 'Postulante',
      width: '2fr',
      cell: row => (
        <div>
          <p className="font-medium text-ink leading-tight">{row.nombre_completo}</p>
          {row.email && <p className="text-[11px] text-muted">{row.email}</p>}
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
        Últimos {informes.length} informes ordenados por actividad reciente.
      </p>

      <div className="mt-8">
        <Table
          columns={columns}
          rows={informes}
          rowKey={row => row.id}
        />
      </div>
    </div>
  )
}
