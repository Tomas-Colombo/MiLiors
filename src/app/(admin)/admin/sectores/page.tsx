import { getSectoresAdmin } from '@/modules/admin/queries'
import { Table, Badge } from '@/components/ui'
import type { Column } from '@/components/ui'
import { CrearSectorForm, SectorAcciones } from './sectores-ui'

export const metadata = { title: 'Sectores — Admin TalentID' }

type Sector = {
  id: string
  nombre_sector: string
  fecha_baja_s: string | null
  created_at: string
}

export default async function SectoresPage() {
  const sectores = await getSectoresAdmin()

  const columns: Column<Sector>[] = [
    {
      key: 'nombre',
      header: 'Nombre',
      width: '2fr',
      cell: row => <span className="font-medium text-ink">{row.nombre_sector}</span>,
    },
    {
      key: 'estado',
      header: 'Estado',
      cell: row =>
        row.fecha_baja_s ? (
          <Badge tone="neutral" dot>Inactivo</Badge>
        ) : (
          <Badge tone="success" dot>Activo</Badge>
        ),
    },
    {
      key: 'created_at',
      header: 'Creado',
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
      cell: row => <SectorAcciones id={row.id} activo={!row.fecha_baja_s} />,
    },
  ]

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <h1 className="text-[22px] font-extrabold tracking-tight text-ink">Sectores industriales</h1>
      <p className="mt-1 text-[13px] text-muted">
        Los sectores inactivos se conservan como baja lógica y no se eliminan.
      </p>

      <div className="mt-8 rounded-xl border border-neutral-200 bg-surface p-6 shadow-card">
        <CrearSectorForm />
      </div>

      <div className="mt-6">
        <Table
          columns={columns}
          rows={sectores}
          rowKey={row => row.id}
        />
      </div>
    </div>
  )
}
