import Link from 'next/link'
import { requireEneagramaCompleto } from '@/lib/guards'
import { TyCGate } from '@/components/shared/tyc-gate'
import { Card, Badge, EmptyState } from '@/components/ui'
import { FileIcon, ChevronLeftIcon, ChevronRightIcon, ArrowRightIcon } from '@/components/icons'
import { getMisPostulaciones, POSTULACIONES_PER_PAGE } from '@/modules/puestos/queries'
import { ESTADO_POSTULACION } from '@/lib/constants/enums'
import type { BadgeProps } from '@/components/ui/badge'
import { PostulacionesFilters } from './filters'

export const metadata = { title: 'Mis postulaciones — TalentID' }

type Tone = NonNullable<BadgeProps['tone']>

const estadoTone: Record<string, Tone> = {
  [ESTADO_POSTULACION.ENVIADA]: 'info',
  [ESTADO_POSTULACION.VISTO]: 'primary',
  [ESTADO_POSTULACION.PROCESO_FINALIZADO]: 'error',
  [ESTADO_POSTULACION.CERRADA]: 'warning',
}

const estadoLabel: Record<string, string> = {
  [ESTADO_POSTULACION.ENVIADA]: 'Enviada',
  [ESTADO_POSTULACION.VISTO]: 'Vista',
  [ESTADO_POSTULACION.PROCESO_FINALIZADO]: 'Descartada',
  [ESTADO_POSTULACION.CERRADA]: 'Cerrada',
}

type SearchParams = Promise<Record<string, string>>

export default async function MisPostulacionesPage({ searchParams }: { searchParams: SearchParams }) {
  await requireEneagramaCompleto()
  const sp = await searchParams
  const page = Math.max(0, parseInt(sp.page ?? '0', 10))
  const q = sp.q ?? ''
  const estado = sp.estado ?? ''
  const hasFilters = !!(q || estado)

  const { items: postulaciones, total } = await getMisPostulaciones({ page, busqueda: q, estado })
  const totalPages = Math.ceil(total / POSTULACIONES_PER_PAGE)

  function pageUrl(p: number) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (estado) params.set('estado', estado)
    if (p > 0) params.set('page', String(p))
    const qs = params.toString()
    return qs ? `/postulante/postulaciones?${qs}` : '/postulante/postulaciones'
  }

  return (
    <TyCGate>
      <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Mis postulaciones</h1>
          <p className="mt-1 text-sm text-muted">
            {total} postulación{total !== 1 ? 'es' : ''}
          </p>
        </div>

        {total === 0 && !hasFilters ? (
          <EmptyState
            icon={<FileIcon size={24} />}
            title="Todavía no postulaste a ningún puesto"
            description="Explorá los puestos disponibles y encontrá tu próxima oportunidad."
          />
        ) : (
          <>
            <PostulacionesFilters />

            {total === 0 ? (
              <EmptyState
                icon={<FileIcon size={24} />}
                title="No hay postulaciones que coincidan"
                description="Probá ajustando la búsqueda o los filtros."
              />
            ) : (
            <div className="space-y-3">
              {postulaciones.map((p) => (
                <Card key={p.id} padding="md">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="text-[14px] font-semibold text-ink truncate">
                        {p.titulo_puesto ?? 'Puesto'}
                      </p>
                      {p.nombre_empresa && (
                        <p className="text-[13px] text-muted">{p.nombre_empresa}</p>
                      )}
                      <p className="text-xs text-neutral-400">
                        Postulado el{' '}
                        {new Date(p.fecha_postulacion).toLocaleDateString('es-AR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    </div>

                    <div className="flex flex-none items-center gap-4">
                      <div className="flex w-28 justify-end">
                        <Badge tone={estadoTone[p.estado] ?? 'neutral'} dot>
                          {estadoLabel[p.estado] ?? p.estado}
                        </Badge>
                      </div>
                      <div className="flex w-24 justify-end">
                        {p.puesto_id && (
                          <Link
                            href={`/postulante/puestos/${p.puesto_id}`}
                            className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors whitespace-nowrap"
                          >
                            Ver puesto
                            <ArrowRightIcon size={13} />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            )}

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                {page > 0 ? (
                  <Link
                    href={pageUrl(page - 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-surface text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
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
                      href={pageUrl(i)}
                      className={[
                        'flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition-colors',
                        i === page
                          ? 'bg-primary-600 text-white'
                          : 'border border-neutral-200 bg-surface text-neutral-600 hover:bg-neutral-50',
                      ].join(' ')}
                    >
                      {i + 1}
                    </Link>
                  ))}
                </div>

                {page < totalPages - 1 ? (
                  <Link
                    href={pageUrl(page + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-surface text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
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
