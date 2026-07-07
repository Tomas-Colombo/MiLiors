import { Suspense } from 'react'
import Link from 'next/link'
import { TyCGate } from '@/components/shared/tyc-gate'
import { Badge, EmptyState, Table } from '@/components/ui'
import type { Column } from '@/components/ui'
import { BuildingIcon, PlusIcon } from '@/components/icons'
import { getMisPuestos } from '@/modules/puestos/queries'
import { paginar } from '@/lib/pagination'
import { Paginador } from '@/components/shared/list-controls'
import { PuestoAcciones } from './puesto-acciones'
import { FiltrosPuestos } from './filtros-puestos'

export const metadata = { title: 'Mis puestos — TalentID' }

type SearchParams = Promise<{ orden?: string; estado?: string; q?: string; page?: string }>

export default async function MisPuestosPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { orden, estado, q: qRaw, page: pageParam } = await searchParams
  const q = qRaw?.trim().toLowerCase() ?? ''
  const puestos = await getMisPuestos()

  // Filtro por estado (activo / cerrado) y búsqueda por título sobre los datos ya cargados
  const filtered = puestos.filter((p) => {
    if (estado === 'activo' && !p.activo) return false
    if (estado === 'cerrado' && p.activo) return false
    if (q && !p.titulo_puesto.toLowerCase().includes(q)) return false
    return true
  })

  // Orden por fecha de publicación (por defecto: más recientes primero)
  const visibles = [...filtered].sort((a, b) => {
    const diff =
      new Date(a.fecha_publicacion).getTime() - new Date(b.fecha_publicacion).getTime()
    return orden === 'antiguos' ? diff : -diff
  })

  const { page, pageCount, slice } = paginar(visibles, pageParam)

  type Puesto = (typeof visibles)[number]

  const columns: Column<Puesto>[] = [
    {
      key: 'titulo',
      header: 'Título',
      width: '2fr',
      cell: (p) => (
        <div>
          <p className="truncate text-[13px] font-semibold text-ink">{p.titulo_puesto}</p>
          {p.nombre_sector && <p className="text-xs text-neutral-400">{p.nombre_sector}</p>}
        </div>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      cell: (p) => (
        <Badge tone={p.activo ? 'success' : 'neutral'} dot>
          {p.activo ? 'Activo' : 'Cerrado'}
        </Badge>
      ),
    },
    {
      key: 'publicado',
      header: 'Publicado',
      cell: (p) => (
        <span className="text-[13px] text-neutral-400">
          {new Date(p.fecha_publicacion).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'center',
      width: '360px',
      cell: (p) => <PuestoAcciones puestoId={p.id} activo={p.activo} />,
    },
  ]

  return (
    <TyCGate>
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-ink">Mis puestos</h1>
            <p className="mt-1 text-muted">{puestos.length} puesto{puestos.length !== 1 ? 's' : ''}</p>
          </div>
          <Link
            href="/reclutador/puestos/nuevo"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-600 px-[18px] text-sm font-semibold text-white hover:brightness-105"
          >
            <PlusIcon size={16} />
            Nuevo puesto
          </Link>
        </div>

        {puestos.length > 0 && (
          <Suspense>
            <FiltrosPuestos totalVisible={visibles.length} totalTotal={puestos.length} />
          </Suspense>
        )}

        {puestos.length === 0 ? (
          <EmptyState
            icon={<BuildingIcon size={24} />}
            title="Todavía no publicaste puestos"
            description="Creá tu primer puesto y empezá a recibir postulaciones."
            action={
              <Link
                href="/reclutador/puestos/nuevo"
                className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-600 px-5 text-sm font-semibold text-white hover:brightness-105"
              >
                <PlusIcon size={16} />
                Publicar puesto
              </Link>
            }
          />
        ) : visibles.length === 0 ? (
          <EmptyState
            icon={<BuildingIcon size={24} />}
            title="Ningún puesto coincide con los filtros"
            description="Probá cambiando o limpiando los filtros."
          />
        ) : (
          <Table columns={columns} rows={slice} rowKey={(p) => p.id} />
        )}

        {visibles.length > 0 && <Paginador page={page} pageCount={pageCount} />}
      </div>
    </TyCGate>
  )
}
