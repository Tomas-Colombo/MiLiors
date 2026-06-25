import Link from 'next/link'
import { TyCGate } from '@/components/shared/tyc-gate'
import { Card, Badge, EmptyState } from '@/components/ui'
import { UsersIcon, MailIcon } from '@/components/icons'
import { getPostulacionesRecibidas } from '@/modules/puestos/queries'
import { ESTADO_POSTULACION } from '@/lib/constants/enums'
import { PostulacionAcciones } from './postulacion-acciones'
import type { BadgeProps } from '@/components/ui/badge'

export const metadata = { title: 'Postulaciones recibidas — TalentID' }

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

export default async function PostulacionesRecibidasPage() {
  const postulaciones = await getPostulacionesRecibidas()

  return (
    <TyCGate>
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Postulaciones recibidas</h1>
          <p className="mt-1 text-muted">
            {postulaciones.length} postulación{postulaciones.length !== 1 ? 'es' : ''}
          </p>
        </div>

        {postulaciones.length === 0 ? (
          <EmptyState
            icon={<UsersIcon size={24} />}
            title="Todavía no recibiste postulaciones"
            description="Publicá puestos para que los candidatos puedan postularse."
          />
        ) : (
          <div className="space-y-4">
            {postulaciones.map((p) => (
              <Card key={p.id} padding="md">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14px] font-semibold text-ink">
                        {p.nombre_completo ?? 'Candidato'}
                      </p>
                      <Badge tone={estadoTone[p.estado] ?? 'neutral'} dot>
                        {estadoLabel[p.estado] ?? p.estado}
                      </Badge>
                    </div>

                    <p className="text-[13px] text-muted truncate">
                      Puesto: <span className="font-medium text-ink-soft">{p.titulo_puesto ?? '—'}</span>
                    </p>

                    {/* Contact info — always visible because applicant applied to this recruiter's post */}
                    <div className="flex flex-wrap gap-4 mt-2">
                      {p.contacto.email && (
                        <a
                          href={`mailto:${p.contacto.email}`}
                          className="inline-flex items-center gap-1.5 text-[12.5px] text-primary-600 hover:underline"
                        >
                          <MailIcon size={13} />
                          {p.contacto.email}
                        </a>
                      )}
                      {p.contacto.telefono && (
                        <a
                          href={`tel:${p.contacto.telefono}`}
                          className="text-[12.5px] text-primary-600 hover:underline"
                        >
                          {p.contacto.telefono}
                        </a>
                      )}
                    </div>

                    <p className="text-xs text-neutral-400">
                      Postulado el{' '}
                      {new Date(p.fecha_postulacion).toLocaleDateString('es-AR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  <div className="flex-none flex flex-col items-end gap-2">
                    <Link
                      href={`/reclutador/postulantes/${p.postulante_id}?postulacion=${p.id}`}
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary-tint px-3 h-8 text-[12.5px] font-semibold text-primary-600 hover:bg-primary-tint-hover transition-colors whitespace-nowrap"
                    >
                      Ver perfil
                    </Link>
                    <PostulacionAcciones postulacionId={p.id} estadoActual={p.estado} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </TyCGate>
  )
}
