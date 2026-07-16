import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireEneagramaCompleto } from '@/lib/guards'
import { TyCGate } from '@/components/shared/tyc-gate'
import { VolverLink } from '@/components/shared/volver-link'
import { Card, Badge } from '@/components/ui'
import { ChevronLeftIcon, CalendarIcon, BuildingIcon, ArrowRightIcon, AlertTriangleIcon } from '@/components/icons'
import { getPuestoPublicoById, getMisPostulacionesPuestoIds } from '@/modules/puestos/queries'
import { getUltimoCertificado } from '@/modules/certificado/queries'
import { getFormularioDePuesto } from '@/modules/preselector/queries'
import { UBICACION_LABEL, CARGA_HORARIA_LABEL } from '@/lib/constants/enums'
import { PostularButton } from '../postular-button'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string>>
}

export default async function PuestoDetallePage({ params, searchParams }: Props) {
  await requireEneagramaCompleto()
  const { id } = await params
  const { from } = await searchParams

  const desdePostulaciones = from === 'postulaciones'
  const volverHref = desdePostulaciones ? '/postulante/postulaciones' : '/postulante/puestos'
  const volverLabel = desdePostulaciones ? 'Mis postulaciones' : 'Buscar puestos'

  const [puesto, yaPostulados, certificado, formulario] = await Promise.all([
    getPuestoPublicoById(id),
    getMisPostulacionesPuestoIds(),
    getUltimoCertificado(),
    getFormularioDePuesto(id),
  ])

  if (!puesto) notFound()

  const bloqueado = !certificado || certificado.desactualizado

  // Sanitized for the applicant: never send esCritica / esValida to the client —
  // that would let a candidate read which options are "correct" from the payload.
  const preguntasPublicas = formulario?.preguntas.map((p) => ({
    id: p.id,
    texto: p.texto,
    tipo: p.tipo,
    opciones: p.opciones.map((o) => ({ id: o.id, texto: o.texto })),
  }))

  return (
    <TyCGate>
      <div className="mx-auto max-w-2xl px-6 py-10 space-y-6">
        {/* Volver */}
        <VolverLink
          href={volverHref}
          className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors"
        >
          <ChevronLeftIcon size={15} />
          {volverLabel}
        </VolverLink>

        {/* Banner certificado */}
        {bloqueado && (
          <div className="flex items-start gap-3 rounded-xl border border-warning-border bg-warning-bg px-4 py-3">
            <AlertTriangleIcon size={18} className="mt-0.5 shrink-0 text-warning-solid" />
            <div className="text-sm">
              <span className="font-semibold text-warning">
                {!certificado ? 'Necesitás un certificado para postularte.' : 'Tu certificado está desactualizado.'}
              </span>
              {' '}
              <Link
                href="/postulante/certificado"
                className="text-warning underline underline-offset-2 hover:text-warning-strong transition-colors"
              >
                {!certificado ? 'Generá tu certificado aquí.' : 'Generá uno nuevo aquí.'}
              </Link>
            </div>
          </div>
        )}

        {/* Card principal */}
        <Card padding="lg" className="space-y-5">
          {/* Encabezado */}
          <div className="space-y-3">
            <h1 className="text-xl font-extrabold text-ink leading-snug">
              {puesto.titulo_puesto}
            </h1>
            {puesto.nombre_empresa && (
              <p className="flex items-center gap-1.5 text-sm text-muted">
                <BuildingIcon size={14} />
                {puesto.nombre_empresa}
              </p>
            )}
            <div className="flex items-center justify-between gap-3">
              {puesto.reclutador_id ? (
                <Link
                  href={`/postulante/reclutadores/${puesto.reclutador_id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-surface px-3 h-9 text-sm font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                >
                  <BuildingIcon size={14} />
                  Ver perfil de la empresa
                  <ArrowRightIcon size={13} />
                </Link>
              ) : (
                <span />
              )}
              <PostularButton
                puestoId={puesto.id}
                yaPostulo={yaPostulados.has(puesto.id)}
                disabled={bloqueado}
                preguntas={preguntasPublicas}
              />
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge tone="neutral">
              {UBICACION_LABEL[puesto.ubicacion] ?? puesto.ubicacion}
            </Badge>
            {puesto.nombre_localidad && (
              <Badge tone="neutral">
                📍 {[puesto.nombre_localidad, puesto.nombre_provincia].filter(Boolean).join(', ')}
              </Badge>
            )}
            <Badge tone="neutral">
              {CARGA_HORARIA_LABEL[puesto.carga_horaria] ?? puesto.carga_horaria}
            </Badge>
            {puesto.nombre_sector && (
              <Badge tone="neutral">{puesto.nombre_sector}</Badge>
            )}
            {puesto.nivel_experiencia && (
              <Badge tone="neutral">{puesto.nivel_experiencia}</Badge>
            )}
            {preguntasPublicas && preguntasPublicas.length > 0 && (
              <Badge tone="info">Con formulario de preselección</Badge>
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
