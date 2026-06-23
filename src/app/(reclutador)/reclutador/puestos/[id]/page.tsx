import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TyCGate } from '@/components/shared/tyc-gate'
import { Card, Badge } from '@/components/ui'
import { ChevronLeftIcon, EditIcon, BuildingIcon } from '@/components/icons'
import { getPuestoById } from '@/modules/puestos/queries'
import { CARGA_HORARIA_LABEL, UBICACION_LABEL } from '@/lib/constants/enums'

export const metadata = { title: 'Detalle del puesto — TalentID' }

// params in Next.js App Router dynamic routes is a Promise
type Params = Promise<{ id: string }>

export default async function PuestoDetallePage({ params }: { params: Params }) {
  const { id } = await params

  const puesto = await getPuestoById(id)
  if (!puesto) notFound()

  return (
    <TyCGate>
      <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
        {/* Back */}
        <Link
          href="/reclutador/puestos"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink transition-colors"
        >
          <ChevronLeftIcon size={16} />
          Volver a mis puestos
        </Link>

        {/* Header card */}
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-[11px] bg-primary-tint text-primary-600">
                  <BuildingIcon size={22} />
                </span>
                <div>
                  <h1 className="text-xl font-extrabold text-ink">{puesto.titulo_puesto}</h1>
                  <p className="text-[13px] text-muted">
                    {puesto.nombre_empresa ?? '—'}
                    {puesto.nombre_sector ? ` · ${puesto.nombre_sector}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={puesto.activo ? 'success' : 'neutral'} dot>
                  {puesto.activo ? 'Activo' : 'Cerrado'}
                </Badge>
                <span className="text-[12px] text-neutral-400">
                  Publicado el{' '}
                  {new Date(puesto.fecha_publicacion).toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>

            <Link
              href={`/reclutador/puestos/${id}/editar`}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-neutral-300 bg-surface px-[18px] text-sm font-semibold text-ink-soft hover:bg-neutral-50"
            >
              <EditIcon size={16} />
              Editar
            </Link>
          </div>
        </Card>

        {/* Description */}
        {puesto.descripcion_texto && (
          <Card>
            <h2 className="text-[14px] font-bold text-ink mb-3">Descripción</h2>
            <p className="text-[13px] leading-relaxed text-ink-soft whitespace-pre-wrap">
              {puesto.descripcion_texto}
            </p>
          </Card>
        )}

        {/* Details */}
        <Card>
          <h2 className="text-[14px] font-bold text-ink mb-3">Detalles</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
            <div>
              <dt className="text-muted">Carga horaria</dt>
              <dd className="font-medium text-ink">
                {CARGA_HORARIA_LABEL[puesto.carga_horaria] ?? puesto.carga_horaria}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Modalidad</dt>
              <dd className="font-medium text-ink">
                {UBICACION_LABEL[puesto.ubicacion] ?? puesto.ubicacion}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Idioma requerido</dt>
              <dd className="font-medium text-ink">{puesto.idioma}</dd>
            </div>
            <div>
              <dt className="text-muted">Nivel de experiencia</dt>
              <dd className="font-medium text-ink">{puesto.nivel_experiencia ?? '—'}</dd>
            </div>
          </dl>
        </Card>

        {/* Private psychological profile — only visible to the recruiter */}
        {puesto.perfil_psicologico_deseado && (
          <Card>
            <h2 className="text-[14px] font-bold text-ink mb-1">Perfil psicológico deseado</h2>
            <p className="text-[12px] text-neutral-400 mb-3">
              Solo visible para vos. Los postulantes nunca verán este campo.
            </p>
            <p className="text-[13px] leading-relaxed text-ink-soft whitespace-pre-wrap">
              {puesto.perfil_psicologico_deseado}
            </p>
          </Card>
        )}
      </div>
    </TyCGate>
  )
}
