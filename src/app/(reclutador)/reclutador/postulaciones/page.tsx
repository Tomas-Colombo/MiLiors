import { Suspense } from 'react'
import Link from 'next/link'
import { Card, Badge, Chip, EmptyState, Tooltip } from '@/components/ui'
import { UsersIcon, MailIcon, FileTextIcon, SparklesIcon, WhatsAppIcon } from '@/components/icons'
import { getPostulacionesRecibidas, getPuestoById } from '@/modules/puestos/queries'
import { getPostulacionesConRespuestas } from '@/modules/preselector/queries'
import { getMotivosNoAvanzar } from '@/modules/postulantes/queries'
import { getMisEmpresasBase } from '@/modules/empresas/queries'
import { getProvincias, getDepartamentosPorProvincia } from '@/modules/ubicacion/queries'
import { ESTADO_POSTULACION, MARCA_POSTULACION } from '@/lib/constants/enums'
import { VerPerfilBtn } from './ver-perfil-btn'
import { VerRespuestasBtn } from './ver-respuestas-btn'
import { NotasModalBtn } from './notas-modal-btn'
import { MarcaPostulacionBtns } from '@/components/shared/marca-postulacion'
import { RevertirDescarteBtn } from './revertir-descarte-btn'
import { FiltrosPostulaciones } from './filtros-postulaciones'
import { paginar } from '@/lib/pagination'
import { normalizarTexto } from '@/lib/texto'
import { Paginador } from '@/components/shared/list-controls'
import type { BadgeProps } from '@/components/ui/badge'
import { requireEmpresaCargada } from '@/lib/guards'

export const metadata = { title: 'Postulaciones recibidas — MiLiors' }

type Tone = NonNullable<BadgeProps['tone']>

const estadoTone: Record<string, Tone> = {
  [ESTADO_POSTULACION.ENVIADA]: 'info',
  [ESTADO_POSTULACION.VISTO]: 'primary',
  [ESTADO_POSTULACION.PROCESO_FINALIZADO]: 'error',
  [ESTADO_POSTULACION.CERRADA]: 'warning',
}

const estadoLabel: Record<string, string> = {
  [ESTADO_POSTULACION.ENVIADA]: 'Sin evaluar',
  [ESTADO_POSTULACION.VISTO]: 'Evaluada',
  [ESTADO_POSTULACION.PROCESO_FINALIZADO]: 'No avanza',
  [ESTADO_POSTULACION.CERRADA]: 'Cerrada',
}

type SearchParams = Promise<{
  puesto?: string; empresa?: string; estado?: string; marca?: string; q?: string; page?: string; ciclos?: string
  carrera?: string; habilidad?: string; provincia?: string; departamento?: string
}>

export default async function PostulacionesRecibidasPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  await requireEmpresaCargada()
  const {
    puesto: filtroPuesto, empresa: filtroEmpresa, estado: filtroEstado, marca: filtroMarca,
    q: qRaw, page: pageParam,
    ciclos: filtroCiclos, carrera: filtroCarrera, habilidad: filtroHabilidad,
    provincia: filtroProvincia, departamento: filtroDepartamento,
  } = await searchParams
  const q = normalizarTexto(qRaw ?? '')
  const [todas, empresas, provincias, departamentos] = await Promise.all([
    getPostulacionesRecibidas(),
    getMisEmpresasBase(),
    getProvincias(),
    filtroProvincia ? getDepartamentosPorProvincia(filtroProvincia) : Promise.resolve([]),
  ])

  // Un puesto reabierto arranca con el tablero limpio: las postulaciones de ciclos
  // anteriores son historial y solo se muestran a pedido.
  const verCiclosAnteriores = filtroCiclos === 'todos'
  const hayCiclosAnteriores = todas.some((p) => !p.es_ciclo_actual)
  const postulaciones = verCiclosAnteriores ? todas : todas.filter((p) => p.es_ciclo_actual)

  // Build the list of unique job posts for the filter dropdown
  const puestosMap = new Map<string, { titulo_puesto: string; cerrado: boolean }>()
  for (const p of postulaciones) {
    if (p.puesto_id && p.titulo_puesto) {
      puestosMap.set(p.puesto_id, { titulo_puesto: p.titulo_puesto, cerrado: p.puesto_cerrado })
    }
  }
  const puestosOpts: { id: string; titulo_puesto: string; cerrado?: boolean; sinPostulaciones?: boolean }[] =
    Array.from(puestosMap.entries()).map(([id, datos]) => ({ id, ...datos }))

  // Todas las empresas del reclutador (no solo las que ya tienen postulaciones):
  // así el link "Ver postulaciones" desde Mis empresas siempre encuentra su opción.
  const empresasOpts = empresas.map((e) => ({
    value: e.id,
    label: e.activa ? e.nombre_empresa : `${e.nombre_empresa} · de baja`,
  }))
  // Empresa elegida que todavía no recibió ninguna postulación: el vacío es de la
  // empresa, no de los demás filtros, y el mensaje lo dice.
  const empresaFiltrada = empresas.find((e) => e.id === filtroEmpresa)
  const empresaSinPostulaciones =
    !!empresaFiltrada && !postulaciones.some((p) => p.empresa_id === filtroEmpresa)

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
      puestosOpts.push({
        id: orphan.id,
        titulo_puesto: orphan.titulo_puesto,
        cerrado: orphan.activo === false,
        sinPostulaciones: true,
      })
      puestoSinPostulaciones = true
    }
  }

  // Apply filters server-side (data already loaded; filter in memory)
  const filtered = postulaciones.filter((p) => {
    if (filtroPuesto && p.puesto_id !== filtroPuesto) return false
    if (filtroEmpresa && p.empresa_id !== filtroEmpresa) return false
    // "No avanza aut." = descarte del preselector, que es lo único que deja motivo.
    if (filtroEstado === 'PROCESO_FINALIZADO_AUTO') {
      if (p.estado !== ESTADO_POSTULACION.PROCESO_FINALIZADO || !p.motivo_descarte) return false
    } else if (filtroEstado && p.estado !== filtroEstado) return false
    if (filtroMarca && p.marca !== filtroMarca) return false
    if (filtroCarrera && p.carrera !== filtroCarrera) return false
    if (filtroHabilidad && !p.habilidades.includes(filtroHabilidad)) return false
    if (filtroProvincia && p.provincia_id !== filtroProvincia) return false
    if (filtroDepartamento && p.departamento_id !== filtroDepartamento) return false
    if (q && !(p.nombre_completo ? normalizarTexto(p.nombre_completo).includes(q) : false)) return false
    return true
  })

  // El conteo del encabezado responde al filtro de puesto: si hay uno elegido,
  // se muestra el total de ese puesto en particular (no el total del reclutador).
  const totalPuesto = filtroPuesto
    ? postulaciones.filter((p) => p.puesto_id === filtroPuesto).length
    : postulaciones.length
  const puestoFiltrado = puestosOpts.find((p) => p.id === filtroPuesto)
  const tituloPuestoFiltrado = puestoFiltrado?.titulo_puesto

  const { page, pageCount, slice } = paginar(filtered, pageParam)

  // Only the visible page needs the "has preselector answers" flag for the button.
  const conRespuestas = await getPostulacionesConRespuestas(slice.map((p) => p.id))

  // Motivo del descarte manual (nota privada) para mostrarlo al pasar por "No avanza".
  const motivosNoAvanzar = await getMotivosNoAvanzar(
    slice
      .filter((p) => p.estado === ESTADO_POSTULACION.PROCESO_FINALIZADO)
      .map((p) => p.postulante_id),
  )

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Postulaciones recibidas</h1>
        <p className="mt-1 text-muted">
          {totalPuesto} postulación{totalPuesto !== 1 ? 'es' : ''}{' '}
          {tituloPuestoFiltrado ? `para ${tituloPuestoFiltrado}` : 'en total'}
        </p>
        {puestoFiltrado?.cerrado && (
          <div className="mt-2">
            <Badge tone="warning" dot>Este puesto está pausado</Badge>
          </div>
        )}
      </div>

      {(postulaciones.length > 0 || puestoSinPostulaciones || !!filtroEmpresa) && (
        <Suspense>
          <FiltrosPostulaciones
            puestos={puestosOpts}
            empresas={empresasOpts}
            carreras={carrerasOpts}
            habilidades={habilidadesOpts}
            provincias={provincias}
            departamentos={departamentos}
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
              : empresaSinPostulaciones
                ? `${empresaFiltrada!.nombre_empresa} todavía no tiene postulaciones`
                : postulaciones.length === 0
                ? 'Todavía no recibiste postulaciones'
                : 'Ninguna postulación coincide con los filtros'
          }
          description={
            puestoSinPostulaciones
              ? 'Cuando un candidato se postule a este puesto, vas a verlo acá.'
              : empresaSinPostulaciones
                ? 'Cuando alguien se postule a un puesto de esta empresa, vas a verlo acá.'
              : postulaciones.length === 0
                ? 'Publicá puestos para que los candidatos puedan postularse.'
                : 'Probá cambiando o limpiando los filtros.'
          }
        />
      ) : (
        <div className="space-y-4">
          {slice.map((p) => {
            // Motivo a mostrar sobre el badge "No avanza": la nota del descarte manual
            // o, si lo descartó el preselector, el motivo automático.
            const motivoManual =
              motivosNoAvanzar.get(`${p.postulante_id}:${p.puesto_id ?? ''}`) ??
              motivosNoAvanzar.get(`${p.postulante_id}:`)
            const detalleNoAvanza =
              p.estado === ESTADO_POSTULACION.PROCESO_FINALIZADO
                ? (motivoManual ?? p.motivo_descarte)
                : null

            return (
            <Card key={p.id} padding="md">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-semibold text-ink">
                      {p.nombre_completo ?? 'Candidato'}
                    </p>
                    {detalleNoAvanza ? (
                      <Tooltip
                        content={
                          <span className="block w-56 whitespace-normal leading-snug">
                            {detalleNoAvanza}
                          </span>
                        }
                      >
                        <Badge tone="error" dot className="cursor-help">
                          {estadoLabel[p.estado] ?? p.estado}
                        </Badge>
                      </Tooltip>
                    ) : (
                      <Badge tone={estadoTone[p.estado] ?? 'neutral'} dot>
                        {estadoLabel[p.estado] ?? p.estado}
                      </Badge>
                    )}
                    {/* Auto-discard indicator — motivo_descarte is only set by the
                        preselector's automatic evaluation, never by a manual "No avanzar" */}
                    {p.estado === ESTADO_POSTULACION.PROCESO_FINALIZADO && p.motivo_descarte && (
                      <Tooltip content={p.motivo_descarte}>
                        <Badge tone="error" className="cursor-help">
                          No avanza automáticamente
                        </Badge>
                      </Tooltip>
                    )}
                    {/* Deshacer un descarte manual o un click accidental */}
                    {p.estado === ESTADO_POSTULACION.PROCESO_FINALIZADO && (
                      <RevertirDescarteBtn postulacionId={p.id} />
                    )}
                    {/* Note indicator */}
                    {p.tiene_nota && (
                      <Tooltip content="Tiene notas privadas cargadas">
                        <span className="inline-flex items-center text-warning-solid">
                          <FileTextIcon size={14} />
                        </span>
                      </Tooltip>
                    )}
                    {/* Marca del reclutador: "Duda" avanza igual que "Avanza",
                        pero se distingue visualmente */}
                    {p.marca === MARCA_POSTULACION.AVANZA && (
                      <Badge tone="success" dot>Avanza</Badge>
                    )}
                    {p.marca === MARCA_POSTULACION.DUDA && (
                      <Badge tone="warning" dot>En duda</Badge>
                    )}
                  </div>

                  <p className="text-[13px] text-muted truncate">
                    Puesto:{' '}
                    <span className="font-medium text-ink-soft">{p.titulo_puesto ?? '—'}</span>
                    {p.nombre_empresa && (
                      <span className="text-neutral-400"> · {p.nombre_empresa}</span>
                    )}
                    {p.puesto_cerrado && (
                      <Badge tone="warning" className="ml-2 align-middle">Puesto pausado</Badge>
                    )}
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

                <div className="w-full sm:w-60 flex-none flex flex-col items-stretch gap-2">
                  <VerPerfilBtn
                    postulacionId={p.id}
                    postulanteId={p.postulante_id}
                    estadoActual={p.estado}
                  />
                  {/* Avanzar / Duda / No avanzar: elegir Avanzar o Duda cancela un
                      "No avanzar" previo (las notas del descarte quedan igual). */}
                  {p.estado !== ESTADO_POSTULACION.CERRADA && (
                    <MarcaPostulacionBtns
                      postulacionId={p.id}
                      postulanteId={p.postulante_id}
                      puestoId={p.puesto_id}
                      tituloPuesto={p.titulo_puesto}
                      marca={p.marca}
                      estadoActual={p.estado}
                    />
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <Tooltip
                      className="w-full"
                      content={
                        <span className="block w-44 whitespace-normal leading-snug">
                          Consultá a la IA sobre este candidato para este puesto.
                        </span>
                      }
                    >
                      <Link
                        href={`/reclutador/asistente?postulante=${p.postulante_id}&puesto=${p.puesto_id ?? ''}&postulacion=${p.id}`}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary-tint px-2 h-8 text-[12.5px] font-semibold text-primary-600 hover:bg-primary-tint-hover transition-colors whitespace-nowrap"
                      >
                        <SparklesIcon size={14} />
                        Asistente IA
                      </Link>
                    </Tooltip>
                    <NotasModalBtn
                      postulanteId={p.postulante_id}
                      puestoId={p.puesto_id}
                      nombrePostulante={p.nombre_completo}
                    />
                  </div>
                  {conRespuestas.has(p.id) && (
                    <VerRespuestasBtn postulacionId={p.id} nombrePostulante={p.nombre_completo} />
                  )}
                </div>
              </div>
            </Card>
            )
          })}
        </div>
      )}

      {filtered.length > 0 && <Paginador page={page} pageCount={pageCount} />}
    </div>
  )
}
