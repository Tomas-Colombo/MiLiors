import { getEmpresasAdmin } from '@/modules/admin/queries'
import { Table, Badge } from '@/components/ui'
import type { Column } from '@/components/ui'

export const metadata = { title: 'Empresas — Admin TalentID' }

type Empresa = {
  id: string
  nombre_empresa: string
  descripcion: string | null
  activa: boolean
  created_at: string
  reclutadores: { id: string; nombre: string; email: string | null }[]
}

export default async function EmpresasPage() {
  const empresas = await getEmpresasAdmin()

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
        <div className="space-y-0.5">
          {row.reclutadores.length === 0 ? (
            <span className="text-[12px] text-neutral-400">Sin reclutadores</span>
          ) : (
            row.reclutadores.map(rec => (
              <div key={rec.id}>
                <p className="text-[12.5px] font-medium text-ink-soft leading-tight">{rec.nombre}</p>
                {rec.email && <p className="text-[11px] text-muted">{rec.email}</p>}
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
        {empresas.length} empresas registradas. Vista de solo lectura en MVP.
      </p>

      <div className="mt-8">
        <Table
          columns={columns}
          rows={empresas}
          rowKey={row => row.id}
        />
      </div>
    </div>
  )
}
