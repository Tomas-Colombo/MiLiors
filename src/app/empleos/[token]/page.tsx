import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSessionUser } from '@/lib/dal'
import { appUrlPublico } from '@/lib/app-url'
import { BrandLogo } from '@/components/shared/brand-logo'
import { Alert, Badge, Card, buttonClassName } from '@/components/ui'
import { BuildingIcon, CalendarIcon, CheckCircleIcon, InfoIcon } from '@/components/icons'
import { getMisPostulacionesPuestoIds, getPuestoPorEnlace } from '@/modules/puestos/queries'
import { CARGA_HORARIA_LABEL, UBICACION_LABEL } from '@/lib/constants/enums'
import { formatFecha } from '@/lib/fecha'
import { urlIniciarSesionConNext } from '@/lib/sanitizar-next'

type Props = { params: Promise<{ token: string }> }

const ROBOTS_PRIVADO = { index: false, follow: false } as const

/**
 * Vista previa pública de un puesto, detrás de su link para compartir.
 *
 * Es dinámica a propósito (sin generateStaticParams ni caché): según quién mira
 * cambia el botón, y un link regenerado tiene que dejar de andar de inmediato.
 * `getPuestoPorEnlace` está memoizada por request, así que `generateMetadata` y la
 * página comparten una sola lectura.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const puesto = await getPuestoPorEnlace(token)

  if (!puesto) {
    return { title: 'Puesto no encontrado — MiLiors', robots: ROBOTS_PRIVADO }
  }

  // El título raíz es `%s` (sin sufijo), así que la marca se agrega acá.
  const titulo = puesto.nombre_empresa
    ? `${puesto.titulo_puesto} en ${puesto.nombre_empresa}`
    : puesto.titulo_puesto
  const descripcion = [
    puesto.nombre_empresa ? `${puesto.nombre_empresa} busca ${puesto.titulo_puesto}.` : `Se busca ${puesto.titulo_puesto}.`,
    puesto.ubicacion_label ? `${puesto.ubicacion_label}.` : null,
    'Mirá el puesto y postulate en MiLiors.',
  ]
    .filter(Boolean)
    .join(' ')

  return {
    title: `${titulo} — MiLiors`,
    description: descripcion,
    robots: ROBOTS_PRIVADO,
    openGraph: {
      title: titulo,
      description: descripcion,
      url: appUrlPublico(`/empleos/${token}`),
      siteName: 'MiLiors',
      type: 'website',
      locale: 'es_AR',
    },
  }
}

export default async function EmpleoPublicoPage({ params }: Props) {
  const { token } = await params
  const puesto = await getPuestoPorEnlace(token)
  if (!puesto) notFound()

  const sesion = await getSessionUser()
  const destino = `/empleos/${token}`

  const yaPostulo =
    sesion?.rol === 'POSTULANTE' ? (await getMisPostulacionesPuestoIds()).has(puesto.puestoId) : false

  return (
    <div className="min-h-screen bg-surface-page">
      <header className="mx-auto flex w-full max-w-2xl items-center px-4 py-5 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-2 text-ink">
          <BrandLogo size={28} />
          <span className="text-md font-extrabold tracking-tight">MiLiors</span>
        </Link>
      </header>

      <main className="mx-auto w-full max-w-2xl space-y-6 px-4 pb-12 sm:px-6">
        {sesion && sesion.rol !== 'POSTULANTE' && (
          <Alert tone="info">Así ven el puesto los candidatos.</Alert>
        )}

        <Card padding="lg" className="space-y-5">
          <div className="space-y-3">
            <h1 className="text-xl font-extrabold leading-snug tracking-tight text-ink">
              {puesto.titulo_puesto}
            </h1>
            {puesto.nombre_empresa && (
              <p className="flex items-center gap-1.5 text-sm text-muted">
                <BuildingIcon size={14} />
                {puesto.nombre_empresa}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge tone="neutral">{UBICACION_LABEL[puesto.ubicacion] ?? puesto.ubicacion}</Badge>
            {puesto.ubicacion_label && <Badge tone="neutral">📍 {puesto.ubicacion_label}</Badge>}
            <Badge tone="neutral">{CARGA_HORARIA_LABEL[puesto.carga_horaria] ?? puesto.carga_horaria}</Badge>
            {puesto.nombre_sector && <Badge tone="neutral">{puesto.nombre_sector}</Badge>}
            {puesto.nivel_experiencia && <Badge tone="neutral">{puesto.nivel_experiencia}</Badge>}
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {puesto.idioma && (
              <>
                <dt className="font-medium text-muted">Idioma</dt>
                <dd className="text-ink">{puesto.idioma}</dd>
              </>
            )}
            {puesto.carreras.length > 0 && (
              <>
                <dt className="font-medium text-muted">Carreras</dt>
                <dd className="text-ink">{puesto.carreras.join(', ')}</dd>
              </>
            )}
            <dt className="font-medium text-muted">Publicado</dt>
            <dd className="flex items-center gap-1.5 text-ink">
              <CalendarIcon size={13} className="text-neutral-400" />
              {formatFecha(puesto.fecha_publicacion, 'larga')}
            </dd>
          </dl>

          {puesto.descripcion_texto && (
            <div className="border-t border-neutral-100 pt-5">
              <h2 className="mb-3 text-compact font-bold uppercase tracking-wider text-neutral-400">
                Descripción del puesto
              </h2>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                {puesto.descripcion_texto}
              </div>
            </div>
          )}
        </Card>

        <Accion
          rol={sesion?.rol ?? null}
          recibePostulaciones={puesto.recibePostulaciones}
          yaPostulo={yaPostulo}
          puestoId={puesto.puestoId}
          token={token}
          destino={destino}
        />
      </main>
    </div>
  )
}

function Accion({
  rol,
  recibePostulaciones,
  yaPostulo,
  puestoId,
  token,
  destino,
}: {
  rol: 'POSTULANTE' | 'RECLUTADOR' | 'ADMIN' | null
  recibePostulaciones: boolean
  yaPostulo: boolean
  puestoId: string
  token: string
  destino: string
}) {
  // Reclutador y admin sólo miran: la leyenda ya está arriba, sin botón.
  if (rol === 'RECLUTADOR' || rol === 'ADMIN') return null

  if (yaPostulo) {
    return (
      <Alert tone="success" title="Ya te postulaste">
        <Link
          href="/postulante/postulaciones"
          className="font-semibold underline underline-offset-2"
        >
          Ver mis postulaciones
        </Link>
      </Alert>
    )
  }

  if (!recibePostulaciones) {
    return (
      <Alert tone="warning" title="Este puesto no está recibiendo postulaciones por ahora." />
    )
  }

  if (rol === 'POSTULANTE') {
    return (
      <div className="flex justify-end">
        <Link
          href={`/postulante/puestos/${puestoId}?enlace=${encodeURIComponent(token)}`}
          className={buttonClassName({ size: 'md' })}
        >
          <CheckCircleIcon size={16} />
          Postularme
        </Link>
      </div>
    )
  }

  return (
    <Card padding="md" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2 text-sm text-ink-soft">
        <InfoIcon size={16} className="mt-0.5 flex-none text-neutral-400" />
        Ingresá o creá tu cuenta para postularte a este puesto. Después volvés acá.
      </p>
      <div className="flex flex-none items-center gap-2">
        <Link
          href={`/registro?next=${encodeURIComponent(destino)}`}
          className={buttonClassName({ variant: 'secondary', size: 'md' })}
        >
          Crear cuenta
        </Link>
        <Link href={urlIniciarSesionConNext(destino)} className={buttonClassName({ size: 'md' })}>
          Postularme
        </Link>
      </div>
    </Card>
  )
}
