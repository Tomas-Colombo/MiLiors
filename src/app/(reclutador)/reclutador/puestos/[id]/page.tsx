import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TyCGate } from '@/components/shared/tyc-gate'
import { Card, Badge, Alert } from '@/components/ui'
import { ChevronLeftIcon, EditIcon, BuildingIcon, CheckCircleIcon } from '@/components/icons'
import { getPuestoById, getContratacionesDePuesto } from '@/modules/puestos/queries'
import { calcularAlertaInactividad } from '@/modules/puestos/actividad-alerta'
import { getConfiguracionSistema } from '@/modules/configuracion/queries'
import { CARGA_HORARIA_LABEL, UBICACION_LABEL } from '@/lib/constants/enums'

export const metadata = { title: 'Detalle del puesto — TalentID' }

// params in Next.js App Router dynamic routes is a Promise
type Params = Promise<{ id: string }>

export default async function PuestoDetallePage({ params }: { params: Params }) {
  const { id } = await params

  const puesto = await getPuestoById(id)
  if (!puesto) notFound()

  const [contrataciones, { diasInactividadCierre }] = await Promise.all([
    getContratacionesDePuesto(id),
    getConfiguracionSistema(),
  ])

  // Alerta de cierre automático por inactividad (solo puestos activos).
  const alerta =
    puesto.activo && puesto.fecha_ultima_actividad
      ? calcularAlertaInactividad(puesto.fecha_ultima_actividad, diasInactividadCierre)
      : null

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

        {/* Advertencia de cierre automático por inactividad */}
        {alerta && (
          <Alert
            tone={alerta.tone}
            title={
              alerta.tone === 'error'
                ? '🔴 Este puesto se cierra mañana por inactividad'
                : `⚠️ Este puesto está inactivo hace ${alerta.diasInactivo} días`
            }
          >
            Si no registramos actividad tuya durante {diasInactividadCierre} días —revisar
            postulaciones, cambiar el estado de una postulación o editar el puesto—, lo
            cerraremos automáticamente para no mantener búsquedas sin atención activa. Realizá
            alguna de esas acciones para mantenerlo activo.
          </Alert>
        )}

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
              <dt className="text-muted">Ubicación</dt>
              <dd className="font-medium text-ink">
                {puesto.nombre_localidad
                  ? [puesto.nombre_localidad, puesto.nombre_provincia].filter(Boolean).join(', ')
                  : '—'}
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

        {/* Historial de contrataciones */}
        {contrataciones.length > 0 && (
          <Card>
            <h2 className="text-[14px] font-bold text-ink mb-3">Historial de contrataciones</h2>
            <ul className="divide-y divide-neutral-100">
              {contrataciones.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-tint text-primary-600">
                      <CheckCircleIcon size={16} />
                    </span>
                    <span className="truncate text-[13px] font-medium text-ink">{c.nombre}</span>
                    {c.externo && (
                      <Badge tone="neutral" className="shrink-0 px-2 py-0.5 text-[10.5px]">Externo</Badge>
                    )}
                  </div>
                  <span className="shrink-0 text-[12px] text-neutral-400">
                    {new Date(c.fecha_contratacion).toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </TyCGate>
  )
}
