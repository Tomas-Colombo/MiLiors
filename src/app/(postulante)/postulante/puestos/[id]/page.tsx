import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireEneagramaCompleto } from '@/lib/guards'
import { TyCGate } from '@/components/shared/tyc-gate'
import { Card, Badge } from '@/components/ui'
import { ChevronLeftIcon, CalendarIcon, BuildingIcon } from '@/components/icons'
import { getPuestoPublicoById, getMisPostulacionesPuestoIds } from '@/modules/puestos/queries'
import { UBICACION_LABEL, CARGA_HORARIA_LABEL } from '@/lib/constants/enums'
import { PostularButton } from '../postular-button'

type Props = { params: Promise<{ id: string }> }

export default async function PuestoDetallePage({ params }: Props) {
  await requireEneagramaCompleto()
  const { id } = await params

  const [puesto, yaPostulados] = await Promise.all([
    getPuestoPublicoById(id),
    getMisPostulacionesPuestoIds(),
  ])

  if (!puesto) notFound()

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

        {/* Card principal */}
        <Card padding="lg" className="space-y-5">
          {/* Encabezado */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-extrabold text-ink leading-snug">
                {puesto.titulo_puesto}
              </h1>
              {puesto.nombre_empresa && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                  <BuildingIcon size={14} />
                  {puesto.nombre_empresa}
                </p>
              )}
            </div>
            <div className="flex-none">
              <PostularButton
                puestoId={puesto.id}
                yaPostulo={yaPostulados.has(puesto.id)}
              />
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge tone="neutral">
              {UBICACION_LABEL[puesto.ubicacion] ?? puesto.ubicacion}
            </Badge>
            <Badge tone="neutral">
              {CARGA_HORARIA_LABEL[puesto.carga_horaria] ?? puesto.carga_horaria}
            </Badge>
            {puesto.nombre_sector && (
              <Badge tone="neutral">{puesto.nombre_sector}</Badge>
            )}
            {puesto.nivel_experiencia && (
              <Badge tone="neutral">{puesto.nivel_experiencia}</Badge>
            )}
          </div>

          {/* Metadata */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {puesto.idioma && (
              <>
                <dt className="text-muted font-medium">Idioma</dt>
                <dd className="text-ink">{puesto.idioma}</dd>
              </>
            )}
            <dt className="text-muted font-medium">Publicado</dt>
            <dd className="flex items-center gap-1.5 text-ink">
              <CalendarIcon size={13} className="text-neutral-400" />
              {new Date(puesto.fecha_publicacion).toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </dd>
          </dl>

          {/* Descripción */}
          {puesto.descripcion_texto && (
            <div className="border-t border-neutral-100 pt-5">
              <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wider text-neutral-400">
                Descripción del puesto
              </h2>
              <div className="whitespace-pre-wrap text-sm text-ink-soft leading-relaxed">
                {puesto.descripcion_texto}
              </div>
            </div>
          )}
        </Card>
      </div>
    </TyCGate>
  )
}
