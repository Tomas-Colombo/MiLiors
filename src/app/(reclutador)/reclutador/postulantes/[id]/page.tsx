import Link from 'next/link'
import { notFound } from 'next/navigation'
import { VolverLink } from '@/components/shared/volver-link'
import { Card, Badge, Chip, Alert } from '@/components/ui'
import {
  ChevronLeftIcon,
  MailIcon,
  SparklesIcon,
  UserIcon,
} from '@/components/icons'

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
import { getPostulanteDetalle, getNotasPrivadas } from '@/modules/postulantes/queries'
import { avanzarEstadoPostulacion } from '@/modules/postulaciones/actions'
import { marcarActividadPuesto } from '@/modules/puestos/actividad'
import { ESTADO_POSTULACION } from '@/lib/constants/enums'
import { InformeDisplay } from '@/modules/informe/informe-display'
import { ubicacionLabel } from '@/lib/ubicacion'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { getFormularioDePuesto, getRespuestasDePostulacion } from '@/modules/preselector/queries'
import { evaluarRespuestasCriticas } from '@/modules/preselector/evaluador'
import { NotasPanel } from './notas-panel'

export const metadata = { title: 'Detalle de postulante — MiLiors' }

// params in Next.js App Router dynamic routes is a Promise
type Params = Promise<{ id: string }>
type SearchParams = Promise<{ postulacion?: string; from?: string; puesto?: string }>

// Destino del enlace "Volver" según de dónde se abrió el perfil. El asistente
// no entra acá: vive bajo un puesto concreto, así que su destino se arma con el
// id que viaja en la URL y no puede salir de un mapa de rutas fijas.
const ORIGENES: Record<string, { href: string; label: string }> = {
  notas: { href: '/reclutador/notas', label: 'Volver a mis notas' },
  postulaciones: { href: '/reclutador/postulaciones', label: 'Volver a las postulaciones' },
}

export default async function PostulanteDetallePage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const { id } = await params
  const { postulacion: postulacionId, from, puesto: puestoOrigenId } = await searchParams
  const volver =
    from === 'puesto-asistente' && puestoOrigenId
      ? {
          href: `/reclutador/puestos/${puestoOrigenId}/asistente`,
          label: 'Volver al asistente',
        }
      : ((from ? ORIGENES[from] : undefined) ?? {
          href: '/reclutador/postulantes',
          label: 'Volver a la búsqueda',
        })

  const [postulante, notas] = await Promise.all([
    getPostulanteDetalle(id),
    getNotasPrivadas(id),
  ])

  // Postulación-scoped data (motivo de descarte + respuestas del formulario preselector).
  // Guarded by ownership: the postulación must belong to this applicant AND to a job post
  // owned by the current recruiter — otherwise an arbitrary ?postulacion= id could leak
  // another candidate's confidential answers.
  let motivoDescarte: string | null = null
  let respuestasFormulario: { preguntaTexto: string; respuestaTexto: string; fallidaCritica: boolean }[] = []

  if (postulacionId) {
    const session = await verifySession()
    const supabase = await createClient()
    const admin = (await import('@/lib/supabase/server-admin')).createAdminClient()

    const { data: reclutador } = await supabase
      .from('perfil_reclutador')
      .select('id')
      .eq('usuario_id', session.id)
      .single()

    if (reclutador) {
      const reclutadorId = (reclutador as { id: string }).id
      const { data: p } = await admin
        .from('postulacion')
        .select('estado, motivo_descarte, puesto_id, postulante_id, puesto(reclutador_id)')
        .eq('id', postulacionId)
        .maybeSingle()

      if (p) {
        const row = p as {
          estado: string
          motivo_descarte: string | null
          puesto_id: string
          postulante_id: string
          puesto: { reclutador_id: string | null } | null
        }
        const pertenece = row.postulante_id === id && row.puesto?.reclutador_id === reclutadorId

        if (pertenece) {
          motivoDescarte = row.motivo_descarte

          // Ver el detalle de una postulación cuenta como actividad del
          // reclutador sobre el puesto (evita el cierre automático), incluso
          // cuando la postulación ya estaba en VISTO y no cambia de estado.
          await marcarActividadPuesto(row.puesto_id)

          // Auto-mark as VISTO when the recruiter opens the profile from the applications list
          if (row.estado === ESTADO_POSTULACION.ENVIADA) {
            await avanzarEstadoPostulacion(postulacionId, 'VISTO')
          }

          const [formulario, respuestas] = await Promise.all([
            getFormularioDePuesto(row.puesto_id),
            getRespuestasDePostulacion(postulacionId),
          ])

          if (formulario && respuestas.length > 0) {
            const evaluacion = evaluarRespuestasCriticas(
              formulario.preguntas.map((preg) => ({
                id: preg.id,
                texto: preg.texto,
                esCritica: preg.esCritica,
                opciones: preg.opciones.map((o) => ({ id: o.id, esValida: o.esValida })),
              })),
              respuestas.map((r) => ({ preguntaId: r.preguntaId, opcionId: r.opcionId })),
            )
            const falladas = new Set(
              evaluacion.aprobado ? [] : evaluacion.preguntasFalladas.map((f) => f.preguntaId),
            )

            respuestasFormulario = respuestas.map((r) => ({
              preguntaTexto: r.preguntaTexto,
              respuestaTexto: r.opcionTexto ?? r.textoLibre ?? '—',
              fallidaCritica: falladas.has(r.preguntaId),
            }))
          }
        }
      }
    }
  }

  if (!postulante) notFound()

  const contactoDisponible = postulante.email !== null

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
      {/* Back */}
      <VolverLink
        href={volver.href}
        className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink transition-colors"
      >
        <ChevronLeftIcon size={16} />
        {volver.label}
      </VolverLink>

      {/* Descarte automático por formulario preselector */}
      {motivoDescarte && (
        <Alert tone="error" title="No avanza automáticamente">
          {motivoDescarte}
        </Alert>
      )}

      {/* Header card */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            {/* Avatar placeholder + name */}
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-tint text-primary-600">
                <UserIcon size={22} />
              </span>
              <div>
                <h1 className="text-xl font-extrabold text-ink">{postulante.nombre_completo}</h1>
                {postulante.carrera && (
                  <p className="text-[13px] text-muted">{postulante.carrera}</p>
                )}
                {ubicacionLabel(postulante) && (
                  <p className="text-[12px] text-neutral-400 mt-0.5">
                    📍 {ubicacionLabel(postulante)}
                  </p>
                )}
              </div>
            </div>

            {/* Eneatipo y estado de búsqueda */}
            <div className="flex flex-wrap items-center gap-2">
              {postulante.eneatipo_numero != null && (
                <Badge tone="primary">
                  Eneatipo {postulante.eneatipo_numero}
                  {postulante.eneatipo_nombre ? ` · ${postulante.eneatipo_nombre}` : ''}
                </Badge>
              )}
              {postulante.perfil_en_busqueda ? (
                <Badge tone="success" dot>En búsqueda activa</Badge>
              ) : (
                <Badge tone="neutral" dot>No está en búsqueda</Badge>
              )}
            </div>

            {/* Competencias */}
            {postulante.competencias.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {postulante.competencias.map((c) => (
                  <Chip key={c.nombre}>{c.nombre}</Chip>
                ))}
              </div>
            )}
          </div>

          {/* AI assistant CTA */}
          <Link
            href={`/reclutador/asistente?postulante=${id}`}
            className="inline-flex items-center gap-2 rounded-md bg-primary-tint px-4 h-10 text-[13px] font-semibold text-primary-600 hover:bg-primary-tint-hover transition-colors"
          >
            <SparklesIcon size={16} />
            Consultar Asistente IA
          </Link>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column — main info */}
        <div className="lg:col-span-2 space-y-6">

          {/* Human Design */}
          {postulante.humanDesign && (
            <Card>
              <h2 className="text-[14px] font-bold text-ink mb-3">Human Design</h2>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                <div>
                  <dt className="text-muted">Tipo energético</dt>
                  <dd className="font-medium text-ink">{postulante.humanDesign.tipo_energetico}</dd>
                </div>
                <div>
                  <dt className="text-muted">Autoridad</dt>
                  <dd className="font-medium text-ink">{postulante.humanDesign.autoridad_hd}</dd>
                </div>
                <div>
                  <dt className="text-muted">Perfil</dt>
                  <dd className="font-medium text-ink">{postulante.humanDesign.perfil_hd}</dd>
                </div>
                <div>
                  <dt className="text-muted">Estrategia</dt>
                  <dd className="font-medium text-ink">{postulante.humanDesign.estrategia_hd}</dd>
                </div>
              </dl>
            </Card>
          )}

          {/* Respuestas del formulario preselector */}
          {respuestasFormulario.length > 0 && (
            <Card>
              <h2 className="text-[14px] font-bold text-ink mb-3">Respuestas del formulario preselector</h2>
              <ul className="space-y-3">
                {respuestasFormulario.map((r, i) => (
                  <li key={i} className="text-[13px]">
                    <p className="font-semibold text-ink">{r.preguntaTexto}</p>
                    <p className={r.fallidaCritica ? 'text-error' : 'text-ink-soft'}>
                      {r.respuestaTexto}
                      {r.fallidaCritica && (
                        <Badge tone="error" className="ml-2 align-middle">
                          Crítica no aprobada
                        </Badge>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Formación académica */}
          {postulante.formaciones.length > 0 && (
            <Card>
              <h2 className="text-[14px] font-bold text-ink mb-3">Formación académica</h2>
              <ul className="space-y-3">
                {postulante.formaciones.map((f, i) => (
                  <li key={i} className="text-[13px]">
                    <p className="font-semibold text-ink">{f.titulo}</p>
                    <p className="text-muted">{f.institucion}</p>
                    {f.fecha_graduacion && (
                      <p className="text-neutral-400 text-xs">
                        {new Date(f.fecha_graduacion).toLocaleDateString('es-AR', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Cursos */}
          {postulante.cursos.length > 0 && (
            <Card>
              <h2 className="text-[14px] font-bold text-ink mb-3">Cursos</h2>
              <ul className="space-y-3">
                {postulante.cursos.map((c, i) => (
                  <li key={i} className="text-[13px]">
                    <p className="font-semibold text-ink">{c.nombre}</p>
                    <p className="text-muted">{c.institucion}</p>
                    <p className="text-neutral-400 text-xs">
                      {[
                        c.fecha_fin
                          ? new Date(c.fecha_fin).toLocaleDateString('es-AR', {
                              month: 'long',
                              year: 'numeric',
                            })
                          : null,
                        c.duracion_horas ? `${c.duracion_horas} h` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    {c.url_credencial && (
                      <a
                        href={c.url_credencial}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-primary-600 hover:underline"
                      >
                        Ver credencial
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Experiencia laboral */}
          {postulante.experiencias.length > 0 && (
            <Card>
              <h2 className="text-[14px] font-bold text-ink mb-3">Experiencia laboral</h2>
              <ul className="space-y-3">
                {postulante.experiencias.map((e, i) => (
                  <li key={i} className="text-[13px]">
                    <p className="font-semibold text-ink">{e.puesto}</p>
                    <p className="text-muted">{e.empresa}</p>
                    <p className="text-neutral-400 text-xs">
                      {new Date(e.fecha_inicio).toLocaleDateString('es-AR', {
                        month: 'short',
                        year: 'numeric',
                      })}
                      {' — '}
                      {e.fecha_fin
                        ? new Date(e.fecha_fin).toLocaleDateString('es-AR', {
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'Actualidad'}
                    </p>
                    {e.descripcion && (
                      <p className="mt-1 whitespace-pre-line text-ink-soft">{e.descripcion}</p>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Idiomas */}
          {postulante.idiomas.length > 0 && (
            <Card>
              <h2 className="text-[14px] font-bold text-ink mb-3">Idiomas</h2>
              <ul className="space-y-1.5">
                {postulante.idiomas.map((id, i) => (
                  <li key={i} className="flex items-center justify-between text-[13px]">
                    <span className="text-ink">{id.nombre}</span>
                    <Badge tone="neutral">{id.nivel_idioma}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Informe de personalidad — colapsado por defecto via <details> (no JS) */}
          {postulante.informe && (
            <Card padding="none">
              <details className="group">
                <summary className="cursor-pointer list-none px-[22px] py-4 flex items-center justify-between">
                  <h2 className="text-[14px] font-bold text-ink">Informe de personalidad</h2>
                  <span className="text-[12px] text-primary-600 font-medium group-open:hidden">
                    Ver informe ▾
                  </span>
                  <span className="text-[12px] text-primary-600 font-medium hidden group-open:inline">
                    Ocultar ▴
                  </span>
                </summary>
                <div className="px-[22px] pb-5 pt-1">
                  <InformeDisplay data={postulante.informe!} variant="compact" />
                </div>
              </details>
            </Card>
          )}
        </div>

        {/* Right column — contact + notes */}
        <div className="space-y-6">
          {/* Contact */}
          <Card>
            <h2 className="text-[14px] font-bold text-ink mb-3">Contacto</h2>
            {contactoDisponible ? (
              <ul className="space-y-2 text-[13px]">
                {postulante.email && (
                  <li className="flex items-center gap-2">
                    <MailIcon size={14} className="text-muted flex-none" />
                    <a
                      href={`mailto:${postulante.email}`}
                      className="text-primary-600 hover:underline truncate"
                    >
                      {postulante.email}
                    </a>
                  </li>
                )}
                {postulante.telefono && (
                  <li className="text-ink">{postulante.telefono}</li>
                )}
                {postulante.enlace_linkedin && (
                  <li>
                    <a
                      href={postulante.enlace_linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:underline"
                    >
                      LinkedIn ↗
                    </a>
                  </li>
                )}
                {postulante.portfolio && (
                  <li>
                    <a
                      href={postulante.portfolio}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:underline"
                    >
                      Portfolio ↗
                    </a>
                  </li>
                )}
              </ul>
            ) : (
              <Alert tone="info">
                Contacto no disponible — este candidato no está en búsqueda activa.
              </Alert>
            )}
            {tiempoRelativo(postulante.ultima_conexion) && (
              <p className="mt-3 pt-3 border-t border-neutral-100 text-[12px] text-neutral-400">
                Último acceso:{' '}
                <span className="font-semibold text-ink">
                  {tiempoRelativo(postulante.ultima_conexion)}
                </span>
              </p>
            )}
          </Card>

          {/* Private notes */}
          <NotasPanel postulanteId={id} notasIniciales={notas} />
        </div>
      </div>
    </div>
  )
}
