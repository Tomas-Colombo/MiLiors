import { getCompetenciasAdmin } from '@/modules/admin/queries'
import { Table, Badge } from '@/components/ui'
import type { Column } from '@/components/ui'
import { CrearCompetenciaForm, CompetenciaAcciones } from './competencias-ui'

export const metadata = { title: 'Competencias — Admin TalentID' }

type Competencia = {
  id: string
  nombre: string
  fecha_baja: string | null
  created_at: string
}

export default async function CompetenciasPage() {
  const competencias = await getCompetenciasAdmin()

  const columns: Column<Competencia>[] = [
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

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <h1 className="text-[22px] font-extrabold tracking-tight text-ink">Competencias laborales</h1>
      <p className="mt-1 text-[13px] text-muted">
        Las competencias inactivas se conservan como baja lógica y no se eliminan.
      </p>

      <div className="mt-8 rounded-xl border border-neutral-200 bg-surface p-6 shadow-card">
        <CrearCompetenciaForm />
      </div>

      <div className="mt-6">
        <Table
          columns={columns}
          rows={competencias}
          rowKey={row => row.id}
        />
      </div>
    </div>
  )
}
