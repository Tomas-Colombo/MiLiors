import { Suspense } from 'react'
import { requireEneagramaCompleto } from '@/lib/guards'
import { TyCGate } from '@/components/shared/tyc-gate'
import { Card, Badge, EmptyState } from '@/components/ui'
import { BuildingIcon, ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'
import {
  getPuestosActivos,
  getSectores,
  getMisPostulacionesPuestoIds,
  PUESTOS_PER_PAGE,
} from '@/modules/puestos/queries'
import { PostularButton } from './postular-button'
import { PuestosFilters } from './filters'
import { PuestoCard } from './puesto-card'
import Link from 'next/link'

export const metadata = { title: 'Buscar puestos — TalentID' }

type SearchParams = Promise<Record<string, string>>

function buildUrl(sp: Record<string, string>, overrides: Record<string, string | undefined>) {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries({ ...sp, ...overrides })) {
    if (v !== undefined && v !== '') params.set(k, v)
  }
  return `/postulante/puestos?${params.toString()}`
}

export default async function BuscarPuestosPage({ searchParams }: { searchParams: SearchParams }) {
  await requireEneagramaCompleto()
  const sp = await searchParams

  const page = Math.max(0, parseInt(sp.page ?? '0', 10))
  const diasDesde = sp.dias ? parseInt(sp.dias, 10) : undefined

  const [{ items: puestos, total }, sectores, yaPostulados] = await Promise.all([
    getPuestosActivos({
      sectorId: sp.sector || undefined,
      cargaHoraria: sp.carga_horaria || undefined,
      ubicacion: sp.ubicacion || undefined,
      busqueda: sp.q || undefined,
      diasDesde,
      page,
    }),
    getSectores(),
    getMisPostulacionesPuestoIds(),
  ])

  const totalPages = Math.ceil(total / PUESTOS_PER_PAGE)

  return (
    <TyCGate>
      <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
        {/* Encabezado */}
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Buscar puestos</h1>
          <p className="mt-1 text-sm text-muted">
            {total} resultado{total !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Filtros */}
        <Card padding="lg">
          <Suspense fallback={<div className="h-36 animate-pulse rounded-lg bg-neutral-100" />}>
            <PuestosFilters sectores={sectores} />
          </Suspense>
        </Card>

        {/* Resultados */}
        {puestos.length === 0 ? (
          <EmptyState
            icon={<BuildingIcon size={24} />}
            title="No encontramos puestos"
            description="Probá ajustando los filtros de búsqueda."
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {puestos.map((puesto) => (
                <PuestoCard
                  key={puesto.id}
                  puesto={puesto}
                  actions={
                    <PostularButton
                      puestoId={puesto.id}
                      yaPostulo={yaPostulados.has(puesto.id)}
                    />
                  }
                />
              ))}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                {page > 0 ? (
                  <Link
                    href={buildUrl(sp, { page: String(page - 1) })}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                  >
                    <ChevronLeftIcon size={16} />
                  </Link>
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-100 text-neutral-300 cursor-not-allowed">
                    <ChevronLeftIcon size={16} />
                  </span>
                )}

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <Link
                      key={i}
                      href={buildUrl(sp, { page: String(i) })}
                      className={[
                        'flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition-colors',
                        i === page
                          ? 'bg-primary-600 text-white'
                          : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50',
                      ].join(' ')}
                    >
                      {i + 1}
                    </Link>
                  ))}
                </div>

                {page < totalPages - 1 ? (
                  <Link
                    href={buildUrl(sp, { page: String(page + 1) })}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                  >
                    <ChevronRightIcon size={16} />
                  </Link>
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-100 text-neutral-300 cursor-not-allowed">
                    <ChevronRightIcon size={16} />
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </TyCGate>
  )
}
