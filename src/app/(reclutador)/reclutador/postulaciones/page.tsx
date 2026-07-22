import { Suspense } from 'react'
import Link from 'next/link'
import { TyCGate } from '@/components/shared/tyc-gate'
import { Card, Badge, Chip, EmptyState, Tooltip } from '@/components/ui'
import { UsersIcon, MailIcon, FileTextIcon, SparklesIcon, WhatsAppIcon } from '@/components/icons'
import { getPostulacionesRecibidas, getPuestoById } from '@/modules/puestos/queries'
import { getPostulacionesConRespuestas } from '@/modules/preselector/queries'
import { ESTADO_POSTULACION } from '@/lib/constants/enums'
import { PostulacionAcciones } from './postulacion-acciones'
import { VerPerfilBtn } from './ver-perfil-btn'
import { VerRespuestasBtn } from './ver-respuestas-btn'
import { NotasModalBtn } from './notas-modal-btn'
import { FavoritoToggle } from './favorito-toggle'
import { FiltrosPostulaciones } from './filtros-postulaciones'
import { paginar } from '@/lib/pagination'
import { Paginador } from '@/components/shared/list-controls'
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

type SearchParams = Promise<{
  puesto?: string; estado?: string; favoritos?: string; q?: string; page?: string; ciclos?: string
  carrera?: string; habilidad?: string
}>

export default async function PostulacionesRecibidasPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const {
    puesto: filtroPuesto, estado: filtroEstado, favoritos: filtroFavoritos, q: qRaw, page: pageParam,
    ciclos: filtroCiclos, carrera: filtroCarrera, habilidad: filtroHabilidad,
  } = await searchParams
  const q = qRaw?.trim().toLowerCase() ?? ''
  const todas = await getPostulacionesRecibidas()

  // Un puesto reabierto arranca con el tablero limpio: las postulaciones de ciclos
  // anteriores son historial y solo se muestran a pedido.
  const verCiclosAnteriores = filtroCiclos === 'todos'
  const hayCiclosAnteriores = todas.some((p) => !p.es_ciclo_actual)
  const postulaciones = verCiclosAnteriores ? todas : todas.filter((p) => p.es_ciclo_actual)

  // Build the list of unique job posts for the filter dropdown
  const puestosMap = new Map<string, string>()
  for (const p of postulaciones) {
    if (p.puesto_id && p.titulo_puesto) {
      puestosMap.set(p.puesto_id, p.titulo_puesto)
    }
  }
  const puestosOpts: { id: string; titulo_puesto: string; sinPostulaciones?: boolean }[] =
    Array.from(puestosMap.entries()).map(([id, titulo_puesto]) => ({ id, titulo_puesto }))

  // Build the list of unique careers and skills present among the applicants for the filter dropdowns
  const carrerasSet = new Set<string>()
  const habilidadesSet = new Set<string>()
  for (const p of postulaciones) {
    if (p.carrera) carrerasSet.add(p.carrera)
    for (const h of p.habilidades) habilidadesSet.add(h)
  }
  const carrerasOpts = Array.from(carrerasSet).sort().map((nombre) => ({ value: nombre, label: nombre }))
  const habilidadesOpts = Array.from(habilidadesSet).sort().map((nombre) => ({ value: nombre, label: nombre }))

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
    if (filtroCarrera && p.carrera !== filtroCarrera) return false
    if (filtroHabilidad && !p.habilidades.includes(filtroHabilidad)) return false
    if (q && !(p.nombre_completo?.toLowerCase().includes(q) ?? false)) return false
    return true
  })

  const { page, pageCount, slice } = paginar(filtered, pageParam)

  // Only the visible page needs the "has preselector answers" flag for the button.
  const conRespuestas = await getPostulacionesConRespuestas(slice.map((p) => p.id))

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
              carreras={carrerasOpts}
              habilidades={habilidadesOpts}
              totalVisible={filtered.length}
              totalTotal={postulaciones.length}
              hayCiclosAnteriores={hayCiclosAnteriores}
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
            {slice.map((p) => (
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
                      {/* Auto-discard indicator — motivo_descarte is only set by the
                          preselector's automatic evaluation, never by a manual "Descartar" */}
                      {p.estado === ESTADO_POSTULACION.PROCESO_FINALIZADO && p.motivo_descarte && (
                        <Tooltip content={p.motivo_descarte}>
                          <Badge tone="error" className="cursor-help">
                            Descartada automáticamente
                          </Badge>
                        </Tooltip>
                      )}
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

                    {p.carrera && (
                      <p className="text-[12px] text-neutral-400">
                        Carrera:{' '}
                        <span className="text-neutral-500">{p.carrera}</span>
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
                        <span className="inline-flex items-center gap-1.5 text-[12.5px]">
                          <a
                            href={`tel:${p.contacto.telefono}`}
                            className="text-primary-600 hover:underline"
                          >
                            {p.contacto.telefono}
                          </a>
                          <a
                            href={`https://wa.me/${p.contacto.telefono.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Abrir chat de WhatsApp"
                            title="Enviar mensaje por WhatsApp"
                            className="text-[#25D366] hover:opacity-80 transition-opacity"
                          >
                            <WhatsAppIcon size={15} />
                          </a>
                        </span>
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

                  {p.habilidades.length > 0 && (
                    <div className="hidden sm:flex sm:w-48 flex-none flex-wrap content-start justify-start gap-1.5 overflow-hidden max-h-36 sm:ml-2">
                      {p.habilidades.slice(0, 5).map((h) => (
                        <Chip key={h} className="!px-2.5 !py-1 !text-[11.5px] whitespace-nowrap">
                          {h.length > 20 ? `${h.slice(0, 20)}…` : h}
                        </Chip>
                      ))}
                    </div>
                  )}

                  <div className="w-full sm:w-44 flex-none flex flex-col items-stretch gap-2">
                    <div className="flex flex-col gap-2 w-full">
                      <VerPerfilBtn
                        postulacionId={p.id}
                        postulanteId={p.postulante_id}
                        estadoActual={p.estado}
                      />
                      <Link
                        href={`/reclutador/asistente?postulante=${p.postulante_id}&puesto=${p.puesto_id ?? ''}&postulacion=${p.id}`}
                        className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary-tint px-3 h-8 text-[12.5px] font-semibold text-primary-600 hover:bg-primary-tint-hover transition-colors whitespace-nowrap"
                      >
                        <SparklesIcon size={14} />
                        Asistente IA
                      </Link>
                      {conRespuestas.has(p.id) && (
                        <VerRespuestasBtn postulacionId={p.id} nombrePostulante={p.nombre_completo} />
                      )}
                      <NotasModalBtn
                        postulanteId={p.postulante_id}
                        puestoId={p.puesto_id}
                        nombrePostulante={p.nombre_completo}
                      />
                    </div>
                    <PostulacionAcciones postulacionId={p.id} estadoActual={p.estado} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {filtered.length > 0 && <Paginador page={page} pageCount={pageCount} />}
      </div>
    </TyCGate>
  )
}
