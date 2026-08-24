import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireEneagramaCompleto } from '@/lib/guards'
import { TyCGate } from '@/components/shared/tyc-gate'
import { VolverLink } from '@/components/shared/volver-link'
import { Card, Badge } from '@/components/ui'
import { ChevronLeftIcon, BuildingIcon, UserIcon, CalendarIcon, ArrowRightIcon } from '@/components/icons'
import { getReclutadorPublico } from '@/modules/puestos/queries'
import { UBICACION_LABEL, CARGA_HORARIA_LABEL } from '@/lib/constants/enums'
import { paginar } from '@/lib/pagination'
import { Paginador } from '@/components/shared/list-controls'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}

export default async function ReclutadorPublicoPage({ params, searchParams }: Props) {
  await requireEneagramaCompleto()
  const [{ id }, { page: pageParam }] = await Promise.all([params, searchParams])

  const reclutador = await getReclutadorPublico(id)
  if (!reclutador) notFound()

  const { nombre_reclutador, empresas, puestos_activos } = reclutador
  const { page, pageCount, slice } = paginar(puestos_activos, pageParam)

  return (
    <TyCGate>
      <div className="mx-auto max-w-2xl px-6 py-10 space-y-6">
        {/* Volver */}
        <VolverLink
          href="/postulante/puestos"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors"
        >
          <ChevronLeftIcon size={15} />
          Buscar puestos
        </VolverLink>

        {/* Header: el perfil es del reclutador, que puede representar a varias empresas. */}
        <Card padding="lg">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-tint text-primary-600">
              <UserIcon size={22} />
            </span>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-extrabold text-ink leading-snug">{nombre_reclutador}</h1>
              <p className="mt-0.5 text-sm text-muted">
                {empresas.length === 0
                  ? 'Reclutador'
                  : empresas.length === 1
                    ? 'Recluta para 1 empresa'
                    : `Recluta para ${empresas.length} empresas`}
              </p>
            </div>
          </div>

          {empresas.length > 0 && (
            <div className="mt-5 space-y-4 border-t border-neutral-100 pt-4">
              {empresas.map((emp) => (
                <div key={emp.id} className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-tint text-primary-600">
                    <BuildingIcon size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-ink leading-snug">
                      {emp.nombre_empresa}
                    </p>
                    {emp.descripcion && (
                      <p className="mt-0.5 text-[13px] text-ink-soft leading-relaxed whitespace-pre-wrap">
                        {emp.descripcion}
                      </p>
                    )}
                    {emp.link_url && (
                      <a
                        href={emp.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                      >
                        Sitio web ↗
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Puestos activos */}
        <section className="space-y-3">
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-neutral-400">
            Puestos activos ({puestos_activos.length})
          </h2>

          {puestos_activos.length === 0 ? (
            <Card padding="lg">
              <p className="text-sm text-muted text-center">No hay puestos activos en este momento.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {slice.map((puesto) => (
                <Card key={puesto.id} padding="md" className="space-y-3">
                  {/* Título + fecha */}
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[15px] font-bold text-ink leading-snug">
                      {puesto.titulo_puesto}
                    </p>
                    <span className="shrink-0 flex items-center gap-1 text-[11px] text-neutral-400 mt-0.5">
                      <CalendarIcon size={11} />
                      {new Date(puesto.fecha_publicacion).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {puesto.nombre_empresa && (
                      <Badge tone="primary">{puesto.nombre_empresa}</Badge>
                    )}
                    <Badge tone="neutral">
                      {UBICACION_LABEL[puesto.ubicacion] ?? puesto.ubicacion}
                    </Badge>
                    <Badge tone="neutral">
                      {CARGA_HORARIA_LABEL[puesto.carga_horaria] ?? puesto.carga_horaria}
                    </Badge>
                    {puesto.nivel_experiencia && (
                      <Badge tone="neutral">{puesto.nivel_experiencia}</Badge>
                    )}
                    {puesto.nombre_sector && (
                      <Badge tone="neutral">{puesto.nombre_sector}</Badge>
                    )}
                  </div>

                  {/* Preview descripción */}
                  {puesto.descripcion_texto && (
                    <p className="text-[13px] text-ink-soft leading-relaxed line-clamp-2">
                      {puesto.descripcion_texto}
                    </p>
                  )}

                  {/* CTA */}
                  <div className="flex justify-end border-t border-neutral-100 pt-3">
                    <Link
                      href={`/postulante/puestos/${puesto.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 h-8 text-xs font-semibold text-white hover:bg-primary-700 transition-colors"
                    >
                      Ver puesto
                      <ArrowRightIcon size={13} />
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Paginador page={page} pageCount={pageCount} />
        </section>
      </div>
    </TyCGate>
  )
}
