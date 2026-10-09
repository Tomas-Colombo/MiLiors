import { Suspense } from 'react'
import { PageHeader, Badge, EmptyState, Table } from '@/components/ui'
import type { Column } from '@/components/ui'
import { BuildingIcon } from '@/components/icons'
import { getMisEmpresas, type EmpresaDelReclutador } from '@/modules/empresas/queries'
import { Paginador } from '@/components/shared/list-controls'
import { paginar } from '@/lib/pagination'
import { normalizarTexto } from '@/lib/texto'
import { FiltrosEmpresas } from './filtros-empresas'
import { NuevaEmpresaBtn, EmpresaAcciones } from './empresas-ui'
import { requireEmpresaCargada } from '@/lib/guards'

export const metadata = { title: 'Mis empresas — MiLiors' }

type SearchParams = Promise<{ q?: string; estado?: string; page?: string }>

export default async function MisEmpresasPage({ searchParams }: { searchParams: SearchParams }) {
  await requireEmpresaCargada()
  const { q: qRaw, estado, page: pageParam } = await searchParams
  const q = normalizarTexto(qRaw ?? '')
  const todas = await getMisEmpresas()

  const filtradas = todas.filter((e) => {
    if (estado === 'activa' && !e.activa) return false
    if (estado === 'baja' && e.activa) return false
    if (q && !normalizarTexto(e.nombre_empresa).includes(q)) return false
    return true
  })

  const { page, pageCount, slice } = paginar(filtradas, pageParam)

  const columns: Column<EmpresaDelReclutador>[] = [
    {
      key: 'empresa',
      header: 'Empresa',
      width: '2fr',
      cell: (e) => (
        <div className="min-w-0">
          <p className="truncate text-compact font-semibold text-ink">{e.nombre_empresa}</p>
          {e.descripcion && (
            <p className="line-clamp-1 text-2xs text-muted">{e.descripcion}</p>
          )}
        </div>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      align: 'center',
      cell: (e) =>
        e.activa ? (
          <Badge tone="success" dot>Activa</Badge>
        ) : (
          <Badge tone="neutral" dot>De baja</Badge>
        ),
    },
    {
      key: 'puestos',
      header: 'Puestos activos',
      align: 'center',
      cell: (e) => <span className="text-compact font-semibold text-ink">{e.puestos_activos}</span>,
    },
    {
      key: 'postulaciones',
      header: 'Postulaciones activas',
      align: 'center',
      cell: (e) => (
        <span className="text-compact font-semibold text-ink">{e.postulaciones_activas}</span>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'center',
      // Tres slots parejos para los botones de EmpresaAcciones. La tabla es
      // overflow-hidden: si la columna queda corta, los botones se recortan.
      width: '400px',
      cell: (e) => <EmpresaAcciones empresa={e} />,
    },
  ]

  // Totales del encabezado: solo lo que sigue en juego (mismo criterio que la tabla).
  const puestosActivos = todas.reduce((acc, e) => acc + e.puestos_activos, 0)
  const postulacionesActivas = todas.reduce((acc, e) => acc + e.postulaciones_activas, 0)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10 space-y-6">
      <PageHeader
        title="Mis empresas"
        description={
          <>
            {todas.length} empresa{todas.length !== 1 ? 's' : ''} · {puestosActivos} puesto
            {puestosActivos !== 1 ? 's' : ''} activo{puestosActivos !== 1 ? 's' : ''} ·{' '}
            {postulacionesActivas} postulación{postulacionesActivas !== 1 ? 'es' : ''} activa
            {postulacionesActivas !== 1 ? 's' : ''}
          </>
        }
        actions={<NuevaEmpresaBtn />}
      />

      {todas.length > 0 && (
        <Suspense>
          <FiltrosEmpresas totalVisible={filtradas.length} totalTotal={todas.length} />
        </Suspense>
      )}

      {todas.length === 0 ? (
        <EmptyState
          icon={<BuildingIcon size={24} />}
          title="Todavía no cargaste empresas"
          description="Cargá la empresa para la que buscás candidatos y vas a poder publicar puestos a su nombre."
          action={<NuevaEmpresaBtn />}
        />
      ) : filtradas.length === 0 ? (
        <EmptyState
          icon={<BuildingIcon size={24} />}
          title="Ninguna empresa coincide con los filtros"
          description="Probá cambiando o limpiando los filtros."
        />
      ) : (
        <Table columns={columns} rows={slice} rowKey={(e) => e.id} />
      )}

      {filtradas.length > 0 && <Paginador page={page} pageCount={pageCount} />}
    </div>
  )
}
