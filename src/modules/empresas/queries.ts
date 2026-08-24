import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import { ESTADO_POSTULACION } from '@/lib/constants/enums'

export type EmpresaOption = {
  id: string
  nombre_empresa: string
  activa: boolean
}

export type EmpresaDelReclutador = EmpresaOption & {
  descripcion: string | null
  link_url: string | null
  created_at: string
  fecha_baja: string | null
  /** Puestos abiertos (activo, sin baja lógica) de la empresa. */
  puestos_activos: number
  /** Postulaciones del ciclo vigente que siguen en juego (enviadas o vistas). */
  postulaciones_activas: number
}

/** id de perfil_reclutador del usuario actual, o null si todavía no lo tiene. */
export const getReclutadorId = cache(async (): Promise<string | null> => {
  const session = await verifySession()
  const supabase = await createClient()

  const { data } = await supabase
    .from('perfil_reclutador')
    .select('id')
    .eq('usuario_id', session.id)
    .maybeSingle()

  return data ? (data as { id: string }).id : null
})

/** Empresas vinculadas al reclutador actual (incluye las dadas de baja). */
export const getMisEmpresasBase = cache(async (): Promise<EmpresaOption[]> => {
  const reclutadorId = await getReclutadorId()
  if (!reclutadorId) return []

  const supabase = await createClient()
  const { data } = await supabase
    .from('reclutador_empresa')
    .select('empresa(id, nombre_empresa, fecha_baja)')
    .eq('reclutador_id', reclutadorId)

  return ((data ?? []) as unknown[])
    .map((row) => (row as { empresa: { id: string; nombre_empresa: string; fecha_baja: string | null } | null }).empresa)
    .filter((e): e is { id: string; nombre_empresa: string; fecha_baja: string | null } => !!e)
    .map((e) => ({ id: e.id, nombre_empresa: e.nombre_empresa, activa: !e.fecha_baja }))
    .sort((a, b) => a.nombre_empresa.localeCompare(b.nombre_empresa, 'es'))
})

/** Empresas elegibles al publicar un puesto (solo las que siguen activas). */
export const getMisEmpresasActivas = cache(async (): Promise<EmpresaOption[]> => {
  const empresas = await getMisEmpresasBase()
  return empresas.filter((e) => e.activa)
})

/**
 * Empresas del reclutador con sus métricas para la sección "Mis empresas".
 *
 * `postulaciones_activas` cuenta solo el ciclo vigente de cada puesto y solo los
 * estados que siguen en juego: una postulación descartada o cerrada ya no suma.
 */
export const getMisEmpresas = cache(async (): Promise<EmpresaDelReclutador[]> => {
  const reclutadorId = await getReclutadorId()
  if (!reclutadorId) return []

  const supabase = await createClient()
  const { data: vinculos } = await supabase
    .from('reclutador_empresa')
    .select('empresa(id, nombre_empresa, descripcion, link_url, created_at, fecha_baja)')
    .eq('reclutador_id', reclutadorId)

  type EmpresaRow = {
    id: string; nombre_empresa: string; descripcion: string | null
    link_url: string | null; created_at: string; fecha_baja: string | null
  }

  const empresas = ((vinculos ?? []) as unknown[])
    .map((row) => (row as { empresa: EmpresaRow | null }).empresa)
    .filter((e): e is EmpresaRow => !!e)

  if (empresas.length === 0) return []

  // Puestos del reclutador en esas empresas (la baja lógica no cuenta para nada).
  const admin = createAdminClient()
  const { data: puestos } = await admin
    .from('puesto')
    .select('id, empresa_id, activo')
    .eq('reclutador_id', reclutadorId)
    .is('fecha_baja_puesto', null)

  const filasPuesto = (puestos ?? []) as { id: string; empresa_id: string; activo: boolean }[]

  const puestosActivos = new Map<string, number>()
  const empresaPorPuesto = new Map<string, string>()
  for (const p of filasPuesto) {
    empresaPorPuesto.set(p.id, p.empresa_id)
    if (p.activo) puestosActivos.set(p.empresa_id, (puestosActivos.get(p.empresa_id) ?? 0) + 1)
  }

  const postulacionesActivas = new Map<string, number>()
  const puestoIds = filasPuesto.map((p) => p.id)

  if (puestoIds.length > 0) {
    // Ciclo vigente de cada puesto: el historial más reciente (abierto o no).
    const { data: ciclos } = await admin
      .from('historial_puesto')
      .select('id, puesto_id, fecha_inicio')
      .in('puesto_id', puestoIds)
      .order('fecha_inicio', { ascending: false })

    const cicloActualPorPuesto = new Map<string, string>()
    for (const c of (ciclos ?? []) as { id: string; puesto_id: string }[]) {
      if (!cicloActualPorPuesto.has(c.puesto_id)) cicloActualPorPuesto.set(c.puesto_id, c.id)
    }

    const { data: postulaciones } = await admin
      .from('postulacion')
      .select('puesto_id, historial_puesto_id, estado')
      .in('puesto_id', puestoIds)
      .in('estado', [ESTADO_POSTULACION.ENVIADA, ESTADO_POSTULACION.VISTO])

    for (const p of (postulaciones ?? []) as { puesto_id: string; historial_puesto_id: string }[]) {
      if (cicloActualPorPuesto.get(p.puesto_id) !== p.historial_puesto_id) continue
      const empresaId = empresaPorPuesto.get(p.puesto_id)
      if (!empresaId) continue
      postulacionesActivas.set(empresaId, (postulacionesActivas.get(empresaId) ?? 0) + 1)
    }
  }

  return empresas
    .map((e) => ({
      id: e.id,
      nombre_empresa: e.nombre_empresa,
      descripcion: e.descripcion,
      link_url: e.link_url,
      created_at: e.created_at,
      fecha_baja: e.fecha_baja,
      activa: !e.fecha_baja,
      puestos_activos: puestosActivos.get(e.id) ?? 0,
      postulaciones_activas: postulacionesActivas.get(e.id) ?? 0,
    }))
    .sort((a, b) => a.nombre_empresa.localeCompare(b.nombre_empresa, 'es'))
})
