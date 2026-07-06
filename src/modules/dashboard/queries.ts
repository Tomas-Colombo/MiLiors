import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'

/** Días sin cambio de estado a partir de los cuales una postulación ENVIADA se
 *  considera "sin acción" (pendiente de revisar). */
const DIAS_SIN_ACCION = 3

/** Postulación mínima que viaja al cliente para alimentar el gráfico y la tasa
 *  de revisión de forma interactiva (sin volver a consultar Supabase). */
export type PostulacionMetrica = {
  puesto_id: string
  estado: string
  fecha_postulacion: string
}

export type DashboardMetrics = {
  /** false → el reclutador no tiene puestos activos (mostrar estado vacío). */
  hasActivePuestos: boolean
  // Bloque 1 — métricas rápidas
  puestosActivos: number
  postulacionesRecibidas: number
  candidatosSinAccion: number
  conInforme: number
  // Bloque 3 — promedio + ranking (globales, no dependen de filtros)
  promedioPorPuesto: number
  ranking: { id: string; titulo: string; total: number }[]
  // Datos para los bloques interactivos (client-side)
  puestosActivosList: { id: string; titulo: string }[]
  postulaciones: PostulacionMetrica[]
}

const EMPTY: DashboardMetrics = {
  hasActivePuestos: false,
  puestosActivos: 0,
  postulacionesRecibidas: 0,
  candidatosSinAccion: 0,
  conInforme: 0,
  promedioPorPuesto: 0,
  ranking: [],
  puestosActivosList: [],
  postulaciones: [],
}

/**
 * Métricas del dashboard de inicio del reclutador actual.
 *
 * Todas las cifras están acotadas a los puestos del reclutador (nunca se
 * exponen datos de otros reclutadores). Se usa el cliente admin sólo para leer
 * las postulaciones e informes de sus propios puestos, replicando el patrón de
 * `getPostulacionesRecibidas`.
 */
export const getDashboardMetrics = cache(async (): Promise<DashboardMetrics> => {
  const session = await verifySession()
  const supabase = await createClient()

  const { data: reclutador } = await supabase
    .from('perfil_reclutador')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!reclutador) return EMPTY
  const reclutadorId = (reclutador as { id: string }).id

  // Puestos vigentes del reclutador (excluye los dados de baja lógicamente).
  const { data: puestosData } = await supabase
    .from('puesto')
    .select('id, titulo_puesto, activo')
    .eq('reclutador_id', reclutadorId)
    .is('fecha_baja_puesto', null)

  const puestos = (puestosData ?? []) as { id: string; titulo_puesto: string; activo: boolean }[]
  if (puestos.length === 0) return EMPTY

  const puestoIds = puestos.map((p) => p.id)
  const activos = puestos.filter((p) => p.activo)
  const activosSet = new Set(activos.map((p) => p.id))
  const tituloPorId = new Map(puestos.map((p) => [p.id, p.titulo_puesto]))

  // Postulaciones de todos los puestos vigentes.
  const admin = createAdminClient()
  const { data: postsData } = await admin
    .from('postulacion')
    .select('estado, fecha_postulacion, updated_at, puesto_id, postulante_id')
    .in('puesto_id', puestoIds)

  const posts = (postsData ?? []) as {
    estado: string
    fecha_postulacion: string
    updated_at: string
    puesto_id: string
    postulante_id: string
  }[]

  // Bloque 1 ─────────────────────────────────────────────────────────────
  const puestosActivos = activos.length
  const postulacionesRecibidas = posts.length

  const umbralSinAccion = Date.now() - DIAS_SIN_ACCION * 24 * 60 * 60 * 1000
  const candidatosSinAccion = posts.filter(
    (p) => p.estado === 'ENVIADA' && new Date(p.updated_at).getTime() < umbralSinAccion,
  ).length

  // Postulantes (distintos) que aplicaron y tienen su informe IA LISTO.
  const postulanteIds = Array.from(new Set(posts.map((p) => p.postulante_id)))
  let conInforme = 0
  if (postulanteIds.length > 0) {
    const { data: informes } = await admin
      .from('informe_personalidad')
      .select('postulante_id')
      .in('postulante_id', postulanteIds)
      .eq('estado_informe', 'LISTO')
    // postulante_id es único en informe_personalidad → cada fila es un postulante.
    conInforme = (informes ?? []).length
  }

  // Bloque 2 y 3 (interactivos / calculados) ──────────────────────────────
  // El gráfico y la tasa de revisión operan sobre el universo de puestos
  // activos, que es también el que ofrece el selector.
  const postsActivos = posts.filter((p) => activosSet.has(p.puesto_id))

  const promedioPorPuesto =
    puestosActivos > 0 ? Math.round((postsActivos.length / puestosActivos) * 10) / 10 : 0

  const conteoPorPuesto = new Map<string, number>()
  for (const p of postsActivos) {
    conteoPorPuesto.set(p.puesto_id, (conteoPorPuesto.get(p.puesto_id) ?? 0) + 1)
  }
  const ranking = activos
    .map((p) => ({ id: p.id, titulo: p.titulo_puesto, total: conteoPorPuesto.get(p.id) ?? 0 }))
    .sort((a, b) => b.total - a.total)

  return {
    hasActivePuestos: puestosActivos > 0,
    puestosActivos,
    postulacionesRecibidas,
    candidatosSinAccion,
    conInforme,
    promedioPorPuesto,
    ranking,
    puestosActivosList: activos.map((p) => ({ id: p.id, titulo: tituloPorId.get(p.id)! })),
    postulaciones: postsActivos.map((p) => ({
      puesto_id: p.puesto_id,
      estado: p.estado,
      fecha_postulacion: p.fecha_postulacion,
    })),
  }
})
