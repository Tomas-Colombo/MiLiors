import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'

export type PuestoItem = {
  id: string
  titulo_puesto: string
  descripcion_texto: string | null
  idioma: string
  carga_horaria: string
  ubicacion: string
  nivel_experiencia: string | null
  activo: boolean
  fecha_publicacion: string
  fecha_baja_puesto: string | null
  empresa_id: string
  sector_id: string | null
  // perfil_psicologico_deseado is intentionally excluded from the public type
  nombre_empresa?: string
  nombre_sector?: string
}

export type PuestoConContacto = PuestoItem & {
  reclutador_nombre: string
  reclutador_email: string
}

/** Puestos publicados por el reclutador actual (incluye activos e inactivos) */
export const getMisPuestos = cache(async (): Promise<(PuestoItem & { perfil_psicologico_deseado: string | null })[]> => {
  const session = await verifySession()
  const supabase = await createClient()

  const { data: reclutador } = await supabase
    .from('perfil_reclutador')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!reclutador) return []

  const { data } = await supabase
    .from('puesto')
    .select(`
      id, titulo_puesto, descripcion_texto, idioma, carga_horaria, ubicacion,
      nivel_experiencia, activo, fecha_publicacion, fecha_baja_puesto,
      empresa_id, sector_id, perfil_psicologico_deseado,
      empresa(nombre_empresa), sector_industrial(nombre_sector)
    `)
    .eq('reclutador_id', (reclutador as { id: string }).id)
    .order('fecha_publicacion', { ascending: false })

  return (data ?? []).map((row: unknown) => {
    const r = row as {
      id: string; titulo_puesto: string; descripcion_texto: string | null
      idioma: string; carga_horaria: string; ubicacion: string
      nivel_experiencia: string | null; activo: boolean
      fecha_publicacion: string; fecha_baja_puesto: string | null
      empresa_id: string; sector_id: string | null
      perfil_psicologico_deseado: string | null
      empresa: { nombre_empresa: string } | null
      sector_industrial: { nombre_sector: string } | null
    }
    return {
      id: r.id,
      titulo_puesto: r.titulo_puesto,
      descripcion_texto: r.descripcion_texto,
      idioma: r.idioma,
      carga_horaria: r.carga_horaria,
      ubicacion: r.ubicacion,
      nivel_experiencia: r.nivel_experiencia,
      activo: r.activo,
      fecha_publicacion: r.fecha_publicacion,
      fecha_baja_puesto: r.fecha_baja_puesto,
      empresa_id: r.empresa_id,
      sector_id: r.sector_id,
      perfil_psicologico_deseado: r.perfil_psicologico_deseado,
      nombre_empresa: r.empresa?.nombre_empresa,
      nombre_sector: r.sector_industrial?.nombre_sector,
    }
  })
})

/** Detalle de un puesto propio del reclutador actual (incluye perfil_psicologico_deseado) */
export const getPuestoById = cache(async (
  puestoId: string
): Promise<(PuestoItem & { perfil_psicologico_deseado: string | null }) | null> => {
  const session = await verifySession()
  const supabase = await createClient()

  const { data: reclutador } = await supabase
    .from('perfil_reclutador')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!reclutador) return null

  const { data } = await supabase
    .from('puesto')
    .select(`
      id, titulo_puesto, descripcion_texto, idioma, carga_horaria, ubicacion,
      nivel_experiencia, activo, fecha_publicacion, fecha_baja_puesto,
      empresa_id, sector_id, perfil_psicologico_deseado,
      empresa(nombre_empresa), sector_industrial(nombre_sector)
    `)
    .eq('id', puestoId)
    .eq('reclutador_id', (reclutador as { id: string }).id)
    .maybeSingle()

  if (!data) return null

  const r = data as {
    id: string; titulo_puesto: string; descripcion_texto: string | null
    idioma: string; carga_horaria: string; ubicacion: string
    nivel_experiencia: string | null; activo: boolean
    fecha_publicacion: string; fecha_baja_puesto: string | null
    empresa_id: string; sector_id: string | null
    perfil_psicologico_deseado: string | null
    empresa: { nombre_empresa: string } | null
    sector_industrial: { nombre_sector: string } | null
  }

  return {
    id: r.id,
    titulo_puesto: r.titulo_puesto,
    descripcion_texto: r.descripcion_texto,
    idioma: r.idioma,
    carga_horaria: r.carga_horaria,
    ubicacion: r.ubicacion,
    nivel_experiencia: r.nivel_experiencia,
    activo: r.activo,
    fecha_publicacion: r.fecha_publicacion,
    fecha_baja_puesto: r.fecha_baja_puesto,
    empresa_id: r.empresa_id,
    sector_id: r.sector_id,
    perfil_psicologico_deseado: r.perfil_psicologico_deseado,
    nombre_empresa: r.empresa?.nombre_empresa,
    nombre_sector: r.sector_industrial?.nombre_sector,
  }
})

/** Puestos activos disponibles para postulantes (SIN perfil_psicologico_deseado) */
export const getPuestosActivos = cache(async (filtros?: {
  sectorId?: string
  cargaHoraria?: string
  ubicacion?: string
  busqueda?: string
}): Promise<PuestoItem[]> => {
  const supabase = await createClient()

  let query = supabase
    .from('puesto')
    .select(`
      id, titulo_puesto, descripcion_texto, idioma, carga_horaria, ubicacion,
      nivel_experiencia, activo, fecha_publicacion, fecha_baja_puesto,
      empresa_id, sector_id,
      empresa(nombre_empresa), sector_industrial(nombre_sector)
    `)
    .eq('activo', true)
    .is('fecha_baja_puesto', null)
    .order('fecha_publicacion', { ascending: false })

  if (filtros?.sectorId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = (query as any).eq('sector_id', filtros.sectorId)
  }
  if (filtros?.cargaHoraria) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = (query as any).eq('carga_horaria', filtros.cargaHoraria)
  }
  if (filtros?.ubicacion) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = (query as any).eq('ubicacion', filtros.ubicacion)
  }
  if (filtros?.busqueda) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = (query as any).ilike('titulo_puesto', `%${filtros.busqueda}%`)
  }

  const { data } = await query

  return (data ?? []).map((row: unknown) => {
    const r = row as {
      id: string; titulo_puesto: string; descripcion_texto: string | null
      idioma: string; carga_horaria: string; ubicacion: string
      nivel_experiencia: string | null; activo: boolean
      fecha_publicacion: string; fecha_baja_puesto: string | null
      empresa_id: string; sector_id: string | null
      empresa: { nombre_empresa: string } | null
      sector_industrial: { nombre_sector: string } | null
    }
    return {
      id: r.id,
      titulo_puesto: r.titulo_puesto,
      descripcion_texto: r.descripcion_texto,
      idioma: r.idioma,
      carga_horaria: r.carga_horaria,
      ubicacion: r.ubicacion,
      nivel_experiencia: r.nivel_experiencia,
      activo: r.activo,
      fecha_publicacion: r.fecha_publicacion,
      fecha_baja_puesto: r.fecha_baja_puesto,
      empresa_id: r.empresa_id,
      sector_id: r.sector_id,
      nombre_empresa: r.empresa?.nombre_empresa,
      nombre_sector: r.sector_industrial?.nombre_sector,
    }
  })
})

/** Sectores activos para filtros */
export const getSectores = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('sector_industrial')
    .select('id, nombre_sector')
    .is('fecha_baja_s', null)
    .order('nombre_sector')
  return (data ?? []) as { id: string; nombre_sector: string }[]
})

/** Postulaciones del postulante actual */
export const getMisPostulaciones = cache(async () => {
  const session = await verifySession()
  const supabase = await createClient()

  const { data: postulante } = await supabase
    .from('perfil_postulante')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!postulante) return []

  const { data } = await supabase
    .from('postulacion')
    .select(`
      id, estado, fecha_postulacion, updated_at,
      puesto(id, titulo_puesto, empresa(nombre_empresa))
    `)
    .eq('postulante_id', (postulante as { id: string }).id)
    .order('fecha_postulacion', { ascending: false })

  return (data ?? []).map((row: unknown) => {
    const r = row as {
      id: string; estado: string; fecha_postulacion: string; updated_at: string
      puesto: { id: string; titulo_puesto: string; empresa: { nombre_empresa: string } | null } | null
    }
    return {
      id: r.id,
      estado: r.estado,
      fecha_postulacion: r.fecha_postulacion,
      updated_at: r.updated_at,
      puesto_id: r.puesto?.id,
      titulo_puesto: r.puesto?.titulo_puesto,
      nombre_empresa: r.puesto?.empresa?.nombre_empresa,
    }
  })
})

/** IDs de puestos a los que ya postuló el postulante (para deshabilitar botón) */
export const getMisPostulacionesPuestoIds = cache(async (): Promise<Set<string>> => {
  const session = await verifySession()
  const supabase = await createClient()

  const { data: postulante } = await supabase
    .from('perfil_postulante')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!postulante) return new Set()

  const { data } = await supabase
    .from('postulacion')
    .select('puesto_id')
    .eq('postulante_id', (postulante as { id: string }).id)

  return new Set((data ?? []).map((r: unknown) => (r as { puesto_id: string }).puesto_id))
})

/** Postulaciones recibidas en los puestos del reclutador actual */
export const getPostulacionesRecibidas = cache(async () => {
  const session = await verifySession()
  const supabase = await createClient()

  const { data: reclutador } = await supabase
    .from('perfil_reclutador')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!reclutador) return []

  // Step 1: load the recruiter's job posts
  const { data: puestos } = await supabase
    .from('puesto')
    .select('id')
    .eq('reclutador_id', (reclutador as { id: string }).id)

  const puestoIds = (puestos ?? []).map((p: unknown) => (p as { id: string }).id)
  if (puestoIds.length === 0) return []

  // Step 2: load applications for those posts
  const admin = createAdminClient()
  const { data: postulaciones } = await admin
    .from('postulacion')
    .select(`
      id, estado, fecha_postulacion, updated_at, postulante_id, puesto_id,
      puesto(id, titulo_puesto),
      perfil_postulante(id, nombre_completo, perfil_en_busqueda, telefono,
        usuario(email))
    `)
    .in('puesto_id', puestoIds)
    .order('fecha_postulacion', { ascending: false })

  return (postulaciones ?? []).map((row: unknown) => {
    const r = row as {
      id: string; estado: string; fecha_postulacion: string; updated_at: string
      postulante_id: string; puesto_id: string
      puesto: { id: string; titulo_puesto: string } | null
      perfil_postulante: {
        id: string; nombre_completo: string
        perfil_en_busqueda: boolean; telefono: string | null
        usuario: { email: string } | null
      } | null
    }

    // Contact is always released: the applicant already applied to one of the recruiter's posts
    const contacto = {
      email: r.perfil_postulante?.usuario?.email ?? null,
      telefono: r.perfil_postulante?.telefono ?? null,
    }

    return {
      id: r.id,
      estado: r.estado,
      fecha_postulacion: r.fecha_postulacion,
      updated_at: r.updated_at,
      puesto_id: r.puesto_id,
      titulo_puesto: r.puesto?.titulo_puesto,
      postulante_id: r.postulante_id,
      nombre_completo: r.perfil_postulante?.nombre_completo,
      contacto,
    }
  })
})
