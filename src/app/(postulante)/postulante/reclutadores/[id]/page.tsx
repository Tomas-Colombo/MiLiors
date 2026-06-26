import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireEneagramaCompleto } from '@/lib/guards'
import { TyCGate } from '@/components/shared/tyc-gate'
import { Card, Badge } from '@/components/ui'
import { ChevronLeftIcon, BuildingIcon, UserIcon, CalendarIcon, ArrowRightIcon } from '@/components/icons'
import { getReclutadorPublico } from '@/modules/puestos/queries'
import { UBICACION_LABEL, CARGA_HORARIA_LABEL } from '@/lib/constants/enums'

type Props = { params: Promise<{ id: string }> }

export default async function ReclutadorPublicoPage({ params }: Props) {
  await requireEneagramaCompleto()
  const { id } = await params

  const reclutador = await getReclutadorPublico(id)
  if (!reclutador) notFound()

  const { nombre_reclutador, empresa, puestos_activos } = reclutador

  return (
    <TyCGate>
      <div className="mx-auto max-w-2xl px-6 py-10 space-y-6">
        {/* Volver */}
        <Link
          href="/postulante/puestos"
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors"
        >
          <ChevronLeftIcon size={15} />
          Buscar puestos
        </Link>

        {/* Header */}
        <Card padding="lg">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-tint text-primary-600">
              <BuildingIcon size={22} />
            </span>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-extrabold text-ink leading-snug">
                {empresa?.nombre_empresa ?? 'Empresa'}
              </h1>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                <UserIcon size={13} />
                {nombre_reclutador}
              </p>
              {empresa?.link_url && (
                <a
                  href={empresa.link_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
                >
                  Sitio web ↗
                </a>
              )}
            </div>
          </div>

          {empresa?.descripcion && (
            <div className="mt-5 border-t border-neutral-100 pt-4">
              <p className="text-sm text-ink-soft leading-relaxed whitespace-pre-wrap">
                {empresa.descripcion}
              </p>
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
              {puestos_activos.map((puesto) => (
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
        </section>
      </div>
    </TyCGate>
  )
}
