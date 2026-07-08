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
  reclutador_id?: string | null
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
    .is('fecha_baja_puesto', null)
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
    .is('fecha_baja_puesto', null)
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

export type ContratacionHistorial = {
  id: string
  nombre: string
  fecha_contratacion: string
  externo: boolean
}

/** Historial de contrataciones de un puesto propio del reclutador actual */
export const getContratacionesDePuesto = cache(async (
  puestoId: string,
): Promise<ContratacionHistorial[]> => {
  const session = await verifySession()
  const supabase = await createClient()

  const { data: reclutador } = await supabase
    .from('perfil_reclutador')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!reclutador) return []

  // Verificar propiedad del puesto
  const { data: puesto } = await supabase
    .from('puesto')
    .select('id')
    .eq('id', puestoId)
    .eq('reclutador_id', (reclutador as { id: string }).id)
    .maybeSingle()

  if (!puesto) return []

  const admin = createAdminClient()
  const { data } = await admin
    .from('contratacion')
    .select(`
      id, fecha_contratacion, nombre_externo,
      perfil_postulante(nombre_completo),
      historial_puesto!inner(puesto_id)
    `)
    .eq('historial_puesto.puesto_id', puestoId)
    .order('fecha_contratacion', { ascending: false })

  return ((data ?? []) as unknown[]).map((row: unknown) => {
    const r = row as {
      id: string
      fecha_contratacion: string
      nombre_externo: string | null
      perfil_postulante: { nombre_completo: string } | null
    }
    const externo = !r.perfil_postulante
    return {
      id: r.id,
      nombre: r.perfil_postulante?.nombre_completo ?? r.nombre_externo ?? 'Contratación externa',
      fecha_contratacion: r.fecha_contratacion,
      externo,
    }
  })
})

export const PUESTOS_PER_PAGE = 12

/** Puestos activos disponibles para postulantes (SIN perfil_psicologico_deseado) */
export const getPuestosActivos = async (filtros?: {
  sectorId?: string
  cargaHoraria?: string
  ubicacion?: string
  busqueda?: string
  diasDesde?: number
  page?: number
  /** 'postulados' = solo los que ya apliqué | 'no_postulados' = solo los que no apliqué */
  postulacion?: 'postulados' | 'no_postulados'
  postulacionIds?: string[]
}): Promise<{ items: PuestoItem[]; total: number }> => {
  const supabase = await createClient()
  const page = filtros?.page ?? 0
  const from = page * PUESTOS_PER_PAGE
  const to = from + PUESTOS_PER_PAGE - 1

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('puesto')
    .select(`
      id, titulo_puesto, descripcion_texto, idioma, carga_horaria, ubicacion,
      nivel_experiencia, activo, fecha_publicacion, fecha_baja_puesto,
      empresa_id, sector_id,
      empresa(nombre_empresa), sector_industrial(nombre_sector)
    `, { count: 'exact' })
    .eq('activo', true)
    .is('fecha_baja_puesto', null)
    .order('fecha_publicacion', { ascending: false })
    .range(from, to)

  if (filtros?.sectorId) query = query.eq('sector_id', filtros.sectorId)
  if (filtros?.cargaHoraria) query = query.eq('carga_horaria', filtros.cargaHoraria)
  if (filtros?.ubicacion) query = query.eq('ubicacion', filtros.ubicacion)
  if (filtros?.busqueda) query = query.ilike('titulo_puesto', `%${filtros.busqueda}%`)
  if (filtros?.diasDesde) {
    const since = new Date()
    since.setDate(since.getDate() - filtros.diasDesde)
    query = query.gte('fecha_publicacion', since.toISOString())
  }
  if (filtros?.postulacion && filtros.postulacionIds) {
    const ids = filtros.postulacionIds
    if (filtros.postulacion === 'postulados' && ids.length > 0) {
      query = query.in('id', ids)
    } else if (filtros.postulacion === 'no_postulados') {
      if (ids.length > 0) query = query.not('id', 'in', `(${ids.join(',')})`)
    }
  }

  const { data, count } = await query

  const items = (data ?? []).map((row: unknown) => {
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

  return { items, total: count ?? 0 }
}

/** Detalle de un puesto público para postulantes (SIN perfil_psicologico_deseado) */
export const getPuestoPublicoById = cache(async (puestoId: string): Promise<PuestoItem | null> => {
  const supabase = await createClient()

  const { data } = await supabase
    .from('puesto')
    .select(`
      id, titulo_puesto, descripcion_texto, idioma, carga_horaria, ubicacion,
      nivel_experiencia, activo, fecha_publicacion, fecha_baja_puesto,
      empresa_id, sector_id, reclutador_id,
      empresa(nombre_empresa), sector_industrial(nombre_sector)
    `)
    .eq('id', puestoId)
    .maybeSingle()

  if (!data) return null

  const r = data as {
    id: string; titulo_puesto: string; descripcion_texto: string | null
    idioma: string; carga_horaria: string; ubicacion: string
    nivel_experiencia: string | null; activo: boolean
    fecha_publicacion: string; fecha_baja_puesto: string | null
    empresa_id: string; sector_id: string | null; reclutador_id: string | null
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
    reclutador_id: r.reclutador_id,
    nombre_empresa: r.empresa?.nombre_empresa,
    nombre_sector: r.sector_industrial?.nombre_sector,
  }
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

export const POSTULACIONES_PER_PAGE = 10

/** Postulaciones del postulante actual */
export const getMisPostulaciones = async (filtros?: {
  page?: number
  estado?: string
  busqueda?: string
  orden?: 'asc' | 'desc'
}) => {
  const session = await verifySession()
  const supabase = await createClient()

  const { data: postulante } = await supabase
    .from('perfil_postulante')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!postulante) return { items: [], total: 0 }

  const page = filtros?.page ?? 0
  const from = page * POSTULACIONES_PER_PAGE
  const to = from + POSTULACIONES_PER_PAGE - 1

  // Al buscar por título hacemos INNER join para que el filtro descarte las
  // postulaciones cuyo puesto no coincide (sin INNER, PostgREST las mantiene con puesto null).
  const puestoJoin = filtros?.busqueda ? 'puesto!inner' : 'puesto'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('postulacion')
    .select(`
      id, estado, fecha_postulacion, updated_at,
      ${puestoJoin}(id, titulo_puesto, empresa(nombre_empresa))
    `, { count: 'exact' })
    .eq('postulante_id', (postulante as { id: string }).id)
    .order('fecha_postulacion', { ascending: filtros?.orden === 'asc' })
    .range(from, to)

  if (filtros?.estado) query = query.eq('estado', filtros.estado)
  if (filtros?.busqueda) {
    query = query.ilike('puesto.titulo_puesto', `%${filtros.busqueda}%`)
  }

  const { data, count } = await query

  const items = ((data ?? []) as unknown[]).map((row: unknown) => {
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

  return { items, total: count ?? 0 }
}

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

  // Step 1: load the recruiter's job posts (excluding logically deleted ones)
  const { data: puestos } = await supabase
    .from('puesto')
    .select('id')
    .eq('reclutador_id', (reclutador as { id: string }).id)
    .is('fecha_baja_puesto', null)

  const puestoIds = (puestos ?? []).map((p: unknown) => (p as { id: string }).id)
  if (puestoIds.length === 0) return []

  const reclutadorId = (reclutador as { id: string }).id

  // Step 2: load applications for those posts
  const admin = createAdminClient()
  const { data: postulaciones } = await admin
    .from('postulacion')
    .select(`
      id, estado, is_favorito, fecha_postulacion, updated_at, postulante_id, puesto_id,
      puesto(id, titulo_puesto),
      perfil_postulante(id, nombre_completo, perfil_en_busqueda, telefono, ultima_conexion,
        usuario(email))
    `)
    .in('puesto_id', puestoIds)
    .order('fecha_postulacion', { ascending: false })

  // Step 3: load note counts per applicant for this recruiter
  const postulanteIds = (postulaciones ?? []).map(
    (r: unknown) => (r as { postulante_id: string }).postulante_id,
  )
  const notaCountMap = new Map<string, number>()
  if (postulanteIds.length > 0) {
    const { data: notas } = await supabase
      .from('nota_privada')
      .select('postulante_id')
      .eq('reclutador_id', reclutadorId)
      .in('postulante_id', postulanteIds)

    for (const n of notas ?? []) {
      const row = n as { postulante_id: string }
      notaCountMap.set(row.postulante_id, (notaCountMap.get(row.postulante_id) ?? 0) + 1)
    }
  }

  return (postulaciones ?? []).map((row: unknown) => {
    const r = row as {
      id: string; estado: string; is_favorito: boolean
      fecha_postulacion: string; updated_at: string
      postulante_id: string; puesto_id: string
      puesto: { id: string; titulo_puesto: string } | null
      perfil_postulante: {
        id: string; nombre_completo: string
        perfil_en_busqueda: boolean; telefono: string | null
        ultima_conexion: string | null
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
      is_favorito: r.is_favorito ?? false,
      fecha_postulacion: r.fecha_postulacion,
      updated_at: r.updated_at,
      puesto_id: r.puesto_id,
      titulo_puesto: r.puesto?.titulo_puesto,
      postulante_id: r.postulante_id,
      nombre_completo: r.perfil_postulante?.nombre_completo,
      ultima_conexion: r.perfil_postulante?.ultima_conexion ?? null,
      contacto,
      tiene_nota: (notaCountMap.get(r.postulante_id) ?? 0) > 0,
    }
  })
})

// ─── Perfil público del reclutador ───────────────────────────────────────────

export type ReclutadorPublicoPuesto = {
  id: string
  titulo_puesto: string
  ubicacion: string
  carga_horaria: string
  fecha_publicacion: string
  descripcion_texto: string | null
  nivel_experiencia: string | null
  nombre_sector: string | null
}

export type ReclutadorPublico = {
  id: string
  nombre_reclutador: string
  empresa: {
    nombre_empresa: string
    descripcion: string | null
    link_url: string | null
  } | null
  puestos_activos: ReclutadorPublicoPuesto[]
}

export const getReclutadorPublico = cache(async (reclutadorId: string): Promise<ReclutadorPublico | null> => {
  const admin = createAdminClient()

  const { data } = await admin
    .from('perfil_reclutador')
    .select(`
      id, nombre_reclutador,
      empresa(nombre_empresa, descripcion, link_url)
    `)
    .eq('id', reclutadorId)
    .maybeSingle()

  if (!data) return null

  const r = data as {
    id: string
    nombre_reclutador: string
    empresa: { nombre_empresa: string; descripcion: string | null; link_url: string | null } | null
  }

  const { data: puestosData } = await admin
    .from('puesto')
    .select('id, titulo_puesto, ubicacion, carga_horaria, fecha_publicacion, descripcion_texto, nivel_experiencia, sector_industrial(nombre_sector)')
    .eq('reclutador_id', reclutadorId)
    .eq('activo', true)
    .order('fecha_publicacion', { ascending: false })

  const puestos: ReclutadorPublicoPuesto[] = (puestosData ?? []).map((row: unknown) => {
    const p = row as {
      id: string; titulo_puesto: string; ubicacion: string; carga_horaria: string
      fecha_publicacion: string; descripcion_texto: string | null; nivel_experiencia: string | null
      sector_industrial: { nombre_sector: string } | null
    }
    return {
      id: p.id,
      titulo_puesto: p.titulo_puesto,
      ubicacion: p.ubicacion,
      carga_horaria: p.carga_horaria,
      fecha_publicacion: p.fecha_publicacion,
      descripcion_texto: p.descripcion_texto,
      nivel_experiencia: p.nivel_experiencia,
      nombre_sector: p.sector_industrial?.nombre_sector ?? null,
    }
  })

  return {
    id: r.id,
    nombre_reclutador: r.nombre_reclutador,
    empresa: r.empresa ?? null,
    puestos_activos: puestos,
  }
})
