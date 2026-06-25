import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TyCGate } from '@/components/shared/tyc-gate'
import { Card, Badge, Chip, Alert } from '@/components/ui'
import {
  ChevronLeftIcon,
  MailIcon,
  SparklesIcon,
  UserIcon,
} from '@/components/icons'
import { getPostulanteDetalle, getNotasPrivadas } from '@/modules/postulantes/queries'
import { avanzarEstadoPostulacion } from '@/modules/postulaciones/actions'
import { ESTADO_POSTULACION } from '@/lib/constants/enums'
import { NotasPanel } from './notas-panel'

export const metadata = { title: 'Detalle de postulante — TalentID' }

// params in Next.js App Router dynamic routes is a Promise
type Params = Promise<{ id: string }>
type SearchParams = Promise<{ postulacion?: string }>

export default async function PostulanteDetallePage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const { id } = await params
  const { postulacion: postulacionId } = await searchParams

  const [postulante, notas] = await Promise.all([
    getPostulanteDetalle(id),
    getNotasPrivadas(id),
  ])

  // Auto-mark as VISTO when the recruiter opens the profile from the applications list
  if (postulacionId) {
    const admin = (await import('@/lib/supabase/server-admin')).createAdminClient()
    const { data: p } = await admin
      .from('postulacion')
      .select('estado')
      .eq('id', postulacionId)
      .single()
    if (p && (p as { estado: string }).estado === ESTADO_POSTULACION.ENVIADA) {
      await avanzarEstadoPostulacion(postulacionId, 'VISTO')
    }
  }

  if (!postulante) notFound()

  const contactoDisponible = postulante.email !== null

  return (
    <TyCGate>
      <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
        {/* Back */}
        <Link
          href="/reclutador/postulantes"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink transition-colors"
        >
          <ChevronLeftIcon size={16} />
          Volver a la búsqueda
        </Link>

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
                  {postulante.especificidad_puesto && (
                    <p className="text-[13px] text-muted">{postulante.especificidad_puesto}</p>
                  )}
                </div>
              </div>

              {/* Eneatipo */}
              {postulante.eneatipo_numero != null && (
                <div className="flex items-center gap-2">
                  <Badge tone="primary">
                    Eneatipo {postulante.eneatipo_numero}
                    {postulante.eneatipo_nombre ? ` · ${postulante.eneatipo_nombre}` : ''}
                  </Badge>
                </div>
              )}

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
                    <div className="prose prose-sm max-w-none text-[13px] leading-relaxed text-ink-soft whitespace-pre-wrap">
                      {postulante.informe}
                    </div>
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
            </Card>

            {/* Private notes */}
            <NotasPanel postulanteId={id} notasIniciales={notas} />
          </div>
        </div>
      </div>
    </TyCGate>
  )
}
