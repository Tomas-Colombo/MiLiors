import { Suspense } from 'react'
import Link from 'next/link'
import { TyCGate } from '@/components/shared/tyc-gate'
import { Badge, EmptyState } from '@/components/ui'
import { BuildingIcon, PlusIcon } from '@/components/icons'
import { getMisPuestos } from '@/modules/puestos/queries'
import { PuestoAcciones } from './puesto-acciones'
import { FiltrosPuestos } from './filtros-puestos'

export const metadata = { title: 'Mis puestos — TalentID' }

type SearchParams = Promise<{ orden?: string; estado?: string }>

export default async function MisPuestosPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { orden, estado } = await searchParams
  const puestos = await getMisPuestos()

  // Filtro por estado (activo / cerrado) sobre los datos ya cargados
  const filtered = puestos.filter((p) => {
    if (estado === 'activo' && !p.activo) return false
    if (estado === 'cerrado' && p.activo) return false
    return true
  })

  // Orden por fecha de publicación (por defecto: más recientes primero)
  const visibles = [...filtered].sort((a, b) => {
    const diff =
      new Date(a.fecha_publicacion).getTime() - new Date(b.fecha_publicacion).getTime()
    return orden === 'antiguos' ? diff : -diff
  })

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
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-surface shadow-card">
            {/* Header */}
            <div className="grid border-b border-neutral-200 px-[22px] py-3.5 text-[11.5px] font-bold uppercase tracking-[0.04em] text-neutral-400"
              style={{ gridTemplateColumns: '2fr 1fr 1fr 360px' }}>
              <span>Título</span>
              <span>Estado</span>
              <span>Publicado</span>
              <span className="text-center">Acciones</span>
            </div>

            {visibles.map((puesto) => (
              <div
                key={puesto.id}
                className="grid items-center border-b border-neutral-100 px-[22px] py-[13px] last:border-0 hover:bg-neutral-50"
                style={{ gridTemplateColumns: '2fr 1fr 1fr 360px' }}
              >
                <div>
                  <p className="text-[13px] font-semibold text-ink truncate">{puesto.titulo_puesto}</p>
                  {puesto.nombre_sector && (
                    <p className="text-xs text-neutral-400">{puesto.nombre_sector}</p>
                  )}
                </div>
                <span>
                  <Badge tone={puesto.activo ? 'success' : 'neutral'} dot>
                    {puesto.activo ? 'Activo' : 'Cerrado'}
                  </Badge>
                </span>
                <p className="text-[13px] text-neutral-400">
                  {new Date(puesto.fecha_publicacion).toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </p>
                <div className="flex justify-center">
                  <PuestoAcciones puestoId={puesto.id} activo={puesto.activo} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </TyCGate>
  )
}
