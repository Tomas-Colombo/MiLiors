import { Suspense } from 'react'
import Link from 'next/link'
import { TyCGate } from '@/components/shared/tyc-gate'
import { Card, Badge, EmptyState } from '@/components/ui'
import { UsersIcon, MailIcon, FileTextIcon, SparklesIcon } from '@/components/icons'
import { getPostulacionesRecibidas, getPuestoById } from '@/modules/puestos/queries'
import { ESTADO_POSTULACION } from '@/lib/constants/enums'
import { PostulacionAcciones } from './postulacion-acciones'
import { FavoritoToggle } from './favorito-toggle'
import { FiltrosPostulaciones } from './filtros-postulaciones'
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

function tiempoRelativo(fecha: string | null): string | null {
  if (!fecha) return null
  const diffMs = Date.now() - new Date(fecha).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 60) return mins <= 1 ? 'hace un momento' : `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return hours === 1 ? 'hace 1 hora' : `hace ${hours} horas`
  const days = Math.floor(hours / 24)
  if (days < 7) return days === 1 ? 'hace 1 día' : `hace ${days} días`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return weeks === 1 ? 'hace 1 semana' : `hace ${weeks} semanas`
  const months = Math.floor(days / 30)
  if (months < 12) return months === 1 ? 'hace 1 mes' : `hace ${months} meses`
  const years = Math.floor(days / 365)
  return years === 1 ? 'hace 1 año' : `hace ${years} años`
}

type SearchParams = Promise<{ puesto?: string; estado?: string; favoritos?: string }>

export default async function PostulacionesRecibidasPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { puesto: filtroPuesto, estado: filtroEstado, favoritos: filtroFavoritos } = await searchParams
  const postulaciones = await getPostulacionesRecibidas()

  // Build the list of unique job posts for the filter dropdown
  const puestosMap = new Map<string, string>()
  for (const p of postulaciones) {
    if (p.puesto_id && p.titulo_puesto) {
      puestosMap.set(p.puesto_id, p.titulo_puesto)
    }
  }
  const puestosOpts: { id: string; titulo_puesto: string; sinPostulaciones?: boolean }[] =
    Array.from(puestosMap.entries()).map(([id, titulo_puesto]) => ({ id, titulo_puesto }))

  // If the recruiter arrives from "Mis puestos" filtering by a job post that has
  // no applications yet, that post is not in the dropdown (built from applications).
  // Fetch its title so the filter can display it (as a disabled option) and we can
  // show a clear "no applications yet" message. getPuestoById enforces ownership.
  let puestoSinPostulaciones = false
  if (filtroPuesto && !puestosMap.has(filtroPuesto)) {
    const orphan = await getPuestoById(filtroPuesto)
    if (orphan) {
      puestosOpts.push({ id: orphan.id, titulo_puesto: orphan.titulo_puesto, sinPostulaciones: true })
      puestoSinPostulaciones = true
    }
  }

  // Apply filters server-side (data already loaded; filter in memory)
  const filtered = postulaciones.filter((p) => {
    if (filtroPuesto && p.puesto_id !== filtroPuesto) return false
    if (filtroEstado && p.estado !== filtroEstado) return false
    if (filtroFavoritos === '1' && !p.is_favorito) return false
    return true
  })

  return (
    <TyCGate>
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Postulaciones recibidas</h1>
          <p className="mt-1 text-muted">
            {postulaciones.length} postulación{postulaciones.length !== 1 ? 'es' : ''} en total
          </p>
        </div>

        {(postulaciones.length > 0 || puestoSinPostulaciones) && (
          <Suspense>
            <FiltrosPostulaciones
              puestos={puestosOpts}
              totalVisible={filtered.length}
              totalTotal={postulaciones.length}
            />
          </Suspense>
        )}

        {filtered.length === 0 ? (
          <EmptyState
            icon={<UsersIcon size={24} />}
            title={
              puestoSinPostulaciones
                ? 'Este puesto todavía no tiene postulaciones'
                : postulaciones.length === 0
                  ? 'Todavía no recibiste postulaciones'
                  : 'Ninguna postulación coincide con los filtros'
            }
            description={
              puestoSinPostulaciones
                ? 'Cuando un candidato se postule a este puesto, vas a verlo acá.'
                : postulaciones.length === 0
                  ? 'Publicá puestos para que los candidatos puedan postularse.'
                  : 'Probá cambiando o limpiando los filtros.'
            }
          />
        ) : (
          <div className="space-y-4">
            {filtered.map((p) => (
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
                      {/* Note indicator */}
                      {p.tiene_nota && (
                        <span
                          title="Tiene notas privadas"
                          className="inline-flex items-center text-warning-solid"
                        >
                          <FileTextIcon size={14} />
                        </span>
                      )}
                      <FavoritoToggle postulacionId={p.id} isFavorito={p.is_favorito} />
                    </div>

                    <p className="text-[13px] text-muted truncate">
                      Puesto:{' '}
                      <span className="font-medium text-ink-soft">{p.titulo_puesto ?? '—'}</span>
                    </p>

                    {tiempoRelativo(p.ultima_conexion) && (
                      <p className="text-[12px] text-neutral-400">
                        Último acceso:{' '}
                        <span className="text-neutral-500">{tiempoRelativo(p.ultima_conexion)}</span>
                      </p>
                    )}

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

                  <div className="w-full sm:w-44 flex-none flex flex-col items-stretch gap-2">
                    <div className="flex flex-col gap-2 w-full">
                      <Link
                        href={`/reclutador/postulantes/${p.postulante_id}?postulacion=${p.id}`}
                        className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary-tint px-3 h-8 text-[12.5px] font-semibold text-primary-600 hover:bg-primary-tint-hover transition-colors whitespace-nowrap"
                      >
                        Ver perfil
                      </Link>
                      <Link
                        href={`/reclutador/asistente?postulante=${p.postulante_id}&puesto=${p.puesto_id ?? ''}&postulacion=${p.id}`}
                        className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary-tint px-3 h-8 text-[12.5px] font-semibold text-primary-600 hover:bg-primary-tint-hover transition-colors whitespace-nowrap"
                      >
                        <SparklesIcon size={14} />
                        Asistente IA
                      </Link>
                    </div>
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
