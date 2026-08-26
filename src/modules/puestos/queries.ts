import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import {
  CARGA_HORARIA,
  ESTADO_POSTULACION,
  UBICACION,
  valorEnum,
  type MarcaPostulacion,
} from '@/lib/constants/enums'

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
  // Solo se completa en las vistas propias del reclutador (getMisPuestos); no se
  // expone a los postulantes. Base de la alerta de cierre por inactividad.
  fecha_ultima_actividad?: string
  empresa_id: string
  sector_id: string | null
  localidad_id: string | null
  reclutador_id?: string | null
  // perfil_psicologico_deseado is intentionally excluded from the public type
  nombre_empresa?: string
  nombre_sector?: string
  /** Carreras del catálogo asociadas al puesto (N–N vía puesto_carrera). */
  carreras: { id: string; nombre: string }[]
  nombre_provincia?: string | null
  nombre_localidad?: string | null
}

/**
 * Embed de ubicación. El puesto sólo guarda `localidad_id`: el departamento y
 * la provincia se alcanzan subiendo por las FKs del catálogo.
 */
type LocalidadEmbed = {
  nombre: string
  departamento: { nombre: string; provincia: { nombre: string } | null } | null
}

/** Fila embebida de puesto_carrera con el nombre de la carrera resuelto. */
type PuestoCarreraRow = { carrera_id: string; carrera: { nombre: string } | null }

/** Normaliza el embed puesto_carrera(...) a la forma { id, nombre }[]. */
function mapCarreras(rows: PuestoCarreraRow[] | null | undefined): { id: string; nombre: string }[] {
  return (rows ?? [])
    .map((pc) => ({ id: pc.carrera_id, nombre: pc.carrera?.nombre ?? '' }))
    .filter((c) => c.nombre !== '')
}

export type PuestoConContacto = PuestoItem & {
  reclutador_nombre: string
  reclutador_email: string
}

/**
 * Postulaciones recibidas por puesto, contando SÓLO el ciclo vigente: si el
 * puesto fue reabierto, las de ciclos anteriores son historial y no suman.
 *
 * El ciclo vigente es el `historial_puesto` más reciente, esté abierto o cerrado
 * (mismo criterio que `es_ciclo_actual` en getPostulacionesRecibidas).
 */
export async function getConteoPostulacionesCicloActual(
  puestoIds: string[],
): Promise<Map<string, number>> {
  const conteo = new Map<string, number>()
  if (puestoIds.length === 0) return conteo

  const admin = createAdminClient()

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
    .select('puesto_id, historial_puesto_id')
    .in('puesto_id', puestoIds)

  for (const p of (postulaciones ?? []) as { puesto_id: string; historial_puesto_id: string }[]) {
    if (cicloActualPorPuesto.get(p.puesto_id) !== p.historial_puesto_id) continue
    conteo.set(p.puesto_id, (conteo.get(p.puesto_id) ?? 0) + 1)
  }

  return conteo
}

/** Ciclo vigente de un puesto: el más reciente, esté abierto (`fin: null`) o cerrado. */
export type CicloVigente = { inicio: string; fin: string | null }

/**
 * Último ciclo de cada puesto, en una sola consulta.
 *
 * `fin` en null significa que el ciclo sigue abierto: el puesto está recibiendo
 * postulaciones y no hay fecha de pausa que mostrar. Al reactivar se abre un ciclo
 * nuevo, así que la pausa anterior deja de ser la vigente sin borrar el historial.
 */
export async function getCiclosVigentes(puestoIds: string[]): Promise<Map<string, CicloVigente>> {
  const vigentes = new Map<string, CicloVigente>()
  if (puestoIds.length === 0) return vigentes

  const admin = createAdminClient()
  const { data } = await admin
    .from('historial_puesto')
    .select('puesto_id, fecha_inicio, fecha_fin')
    .in('puesto_id', puestoIds)
    .order('fecha_inicio', { ascending: false })

  for (const c of (data ?? []) as { puesto_id: string; fecha_inicio: string; fecha_fin: string | null }[]) {
    if (vigentes.has(c.puesto_id)) continue
    vigentes.set(c.puesto_id, { inicio: c.fecha_inicio, fin: c.fecha_fin })
  }

  return vigentes
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
      nivel_experiencia, activo, fecha_publicacion, fecha_baja_puesto, fecha_ultima_actividad,
      empresa_id, sector_id, localidad_id, perfil_psicologico_deseado,
      empresa(nombre_empresa), sector_industrial(nombre_sector), puesto_carrera(carrera_id, carrera(nombre)),
      localidad(nombre, departamento(nombre, provincia(nombre)))
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
      fecha_ultima_actividad: string
      empresa_id: string; sector_id: string | null
      localidad_id: string | null
      perfil_psicologico_deseado: string | null
      empresa: { nombre_empresa: string } | null
      sector_industrial: { nombre_sector: string } | null
      puesto_carrera: PuestoCarreraRow[] | null
      localidad: LocalidadEmbed | null
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
      fecha_ultima_actividad: r.fecha_ultima_actividad,
      empresa_id: r.empresa_id,
      sector_id: r.sector_id,
      localidad_id: r.localidad_id,
      perfil_psicologico_deseado: r.perfil_psicologico_deseado,
      nombre_empresa: r.empresa?.nombre_empresa,
      nombre_sector: r.sector_industrial?.nombre_sector,
      carreras: mapCarreras(r.puesto_carrera),
      nombre_provincia: r.localidad?.departamento?.provincia?.nombre ?? null,
      nombre_localidad: r.localidad?.nombre ?? null,
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
      nivel_experiencia, activo, fecha_publicacion, fecha_baja_puesto, fecha_ultima_actividad,
      empresa_id, sector_id, localidad_id, perfil_psicologico_deseado,
      empresa(nombre_empresa), sector_industrial(nombre_sector), puesto_carrera(carrera_id, carrera(nombre)),
      localidad(nombre, departamento(nombre, provincia(nombre)))
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
    fecha_ultima_actividad: string
    empresa_id: string; sector_id: string | null
    localidad_id: string | null
    perfil_psicologico_deseado: string | null
    empresa: { nombre_empresa: string } | null
    sector_industrial: { nombre_sector: string } | null
    puesto_carrera: PuestoCarreraRow[] | null
    localidad: LocalidadEmbed | null
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
    fecha_ultima_actividad: r.fecha_ultima_actividad,
    empresa_id: r.empresa_id,
    sector_id: r.sector_id,
    localidad_id: r.localidad_id,
    perfil_psicologico_deseado: r.perfil_psicologico_deseado,
    nombre_empresa: r.empresa?.nombre_empresa,
    nombre_sector: r.sector_industrial?.nombre_sector,
    carreras: mapCarreras(r.puesto_carrera),
    nombre_provincia: r.localidad?.departamento?.provincia?.nombre ?? null,
    nombre_localidad: r.localidad?.nombre ?? null,
  }
})

/** Total de postulaciones recibidas por un puesto propio (todos los ciclos). */
export const getTotalPostulacionesDePuesto = cache(async (puestoId: string): Promise<number> => {
  // getPuestoById ya valida propiedad y está cacheado por request.
  const puesto = await getPuestoById(puestoId)
  if (!puesto) return 0

  const admin = createAdminClient()
  const { count } = await admin
    .from('postulacion')
    .select('id', { count: 'exact', head: true })
    .eq('puesto_id', puestoId)

  return count ?? 0
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
  carreraId?: string
  cargaHoraria?: string
  ubicacion?: string
  provinciaId?: string
  departamentoId?: string
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

  // Filtro por carrera: ahora es N–N. Resolvemos primero los puesto_id que tienen
  // esa carrera y luego restringimos por id (más simple que un embed !inner, que
  // además recortaría las carreras devueltas para la card).
  let carreraPuestoIds: string[] | null = null
  if (filtros?.carreraId) {
    const { data: pc } = await supabase
      .from('puesto_carrera')
      .select('puesto_id')
      .eq('carrera_id', filtros.carreraId)
    carreraPuestoIds = ((pc ?? []) as { puesto_id: string }[]).map((r) => r.puesto_id)
    if (carreraPuestoIds.length === 0) return { items: [], total: 0 }
  }

  // Filtro geográfico. Un puesto remoto no tiene localidad pero es relevante en
  // cualquier provincia, así que no puede resolverse con un embed !inner sobre
  // localidad: ese JOIN interno borraba del listado justamente a los remotos.
  // Se resuelven aparte los puestos que caen en el área pedida y después se los
  // une con los remotos, dejando el embed en LEFT.
  let geoPuestoIds: string[] | null = null
  if (filtros?.provinciaId || filtros?.departamentoId) {
    let geo = supabase
      .from('puesto')
      .select('id, localidad!inner(departamento!inner(provincia_id))')
    if (filtros.provinciaId) geo = geo.eq('localidad.departamento.provincia_id', filtros.provinciaId)
    if (filtros.departamentoId) geo = geo.eq('localidad.departamento_id', filtros.departamentoId)
    const { data: geoData } = await geo
    geoPuestoIds = ((geoData ?? []) as { id: string }[]).map((r) => r.id)
  }

  let query = supabase
    .from('puesto')
    .select(`
      id, titulo_puesto, descripcion_texto, idioma, carga_horaria, ubicacion,
      nivel_experiencia, activo, fecha_publicacion, fecha_baja_puesto,
      empresa_id, sector_id, localidad_id,
      empresa(nombre_empresa), sector_industrial(nombre_sector), puesto_carrera(carrera_id, carrera(nombre)),
      localidad(nombre, departamento(nombre, provincia(nombre)))
    `, { count: 'exact' })
    .eq('activo', true)
    .is('fecha_baja_puesto', null)
    .order('fecha_publicacion', { ascending: false })
    .range(from, to)

  if (filtros?.sectorId) query = query.eq('sector_id', filtros.sectorId)
  if (carreraPuestoIds) query = query.in('id', carreraPuestoIds)
  const cargaHoraria = valorEnum(CARGA_HORARIA, filtros?.cargaHoraria)
  if (cargaHoraria) query = query.eq('carga_horaria', cargaHoraria)
  const ubicacion = valorEnum(UBICACION, filtros?.ubicacion)
  if (ubicacion) query = query.eq('ubicacion', ubicacion)
  // Los remotos entran en cualquier área: no tienen provincia que contradiga el
  // filtro. Si el postulante además eligió una modalidad, ese `.eq` de arriba
  // manda y los vuelve a excluir cuando corresponde.
  if (geoPuestoIds) {
    query = geoPuestoIds.length > 0
      ? query.or(`id.in.(${geoPuestoIds.join(',')}),ubicacion.eq.${UBICACION.REMOTO}`)
      : query.eq('ubicacion', UBICACION.REMOTO)
  }
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
      localidad_id: string | null
      empresa: { nombre_empresa: string } | null
      sector_industrial: { nombre_sector: string } | null
      puesto_carrera: PuestoCarreraRow[] | null
      localidad: LocalidadEmbed | null
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
      localidad_id: r.localidad_id,
      nombre_empresa: r.empresa?.nombre_empresa,
      nombre_sector: r.sector_industrial?.nombre_sector,
      carreras: mapCarreras(r.puesto_carrera),
      nombre_provincia: r.localidad?.departamento?.provincia?.nombre ?? null,
      nombre_localidad: r.localidad?.nombre ?? null,
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
      empresa_id, sector_id, reclutador_id, localidad_id,
      empresa(nombre_empresa), sector_industrial(nombre_sector), puesto_carrera(carrera_id, carrera(nombre)),
      localidad(nombre, departamento(nombre, provincia(nombre)))
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
    localidad_id: string | null
    empresa: { nombre_empresa: string } | null
    sector_industrial: { nombre_sector: string } | null
    puesto_carrera: PuestoCarreraRow[] | null
    localidad: LocalidadEmbed | null
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
    localidad_id: r.localidad_id,
    nombre_empresa: r.empresa?.nombre_empresa,
    nombre_sector: r.sector_industrial?.nombre_sector,
    carreras: mapCarreras(r.puesto_carrera),
    nombre_provincia: r.localidad?.departamento?.provincia?.nombre ?? null,
    nombre_localidad: r.localidad?.nombre ?? null,
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

  let query = supabase
    .from('postulacion')
    .select(`
      id, estado, fecha_postulacion, updated_at,
      ${puestoJoin}(id, titulo_puesto, empresa(nombre_empresa))
    `, { count: 'exact' })
    .eq('postulante_id', (postulante as { id: string }).id)
    .order('fecha_postulacion', { ascending: filtros?.orden === 'asc' })
    .range(from, to)

  const estado = valorEnum(ESTADO_POSTULACION, filtros?.estado)
  if (estado) query = query.eq('estado', estado)
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

/**
 * IDs de puestos donde el postulante ya aplicó AL CICLO VIGENTE (para deshabilitar
 * el botón).
 *
 * Las postulaciones de ciclos ya cerrados no cuentan: si el puesto se reactivó,
 * abrió un ciclo nuevo y el postulante puede volver a aplicar. Filtrar por ciclo
 * abierto en vez de por puesto es lo que evita que quien postuló antes del cierre
 * quede bloqueado para siempre.
 *
 * Se resuelve en dos pasos en vez de con un embed !inner: la FK a historial_puesto
 * es compuesta (id, puesto_id) y no vale la pena atarse a cómo PostgREST la resuelve.
 */
export const getMisPostulacionesPuestoIds = cache(async (): Promise<Set<string>> => {
  const session = await verifySession()
  const supabase = await createClient()

  const { data: postulante } = await supabase
    .from('perfil_postulante')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!postulante) return new Set()

  const { data: postulaciones } = await supabase
    .from('postulacion')
    .select('puesto_id, historial_puesto_id')
    .eq('postulante_id', (postulante as { id: string }).id)

  const filas = (postulaciones ?? []) as { puesto_id: string; historial_puesto_id: string }[]
  if (filas.length === 0) return new Set()

  const { data: ciclosAbiertos } = await supabase
    .from('historial_puesto')
    .select('id')
    .in('id', [...new Set(filas.map((r) => r.historial_puesto_id))])
    .is('fecha_fin', null)

  const abiertos = new Set(
    ((ciclosAbiertos ?? []) as { id: string }[]).map((c) => c.id),
  )

  return new Set(
    filas.filter((r) => abiertos.has(r.historial_puesto_id)).map((r) => r.puesto_id),
  )
})

/**
 * Postulaciones recibidas en los puestos del reclutador actual.
 *
 * Cada fila trae `es_ciclo_actual`: las de ciclos anteriores (reaperturas previas)
 * son historial y la página las esconde salvo pedido explícito, para que reactivar
 * un puesto no arrastre candidatos viejos al tablero.
 */
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
      id, estado, marca, fecha_postulacion, updated_at, postulante_id, puesto_id,
      historial_puesto_id, motivo_descarte,
      puesto(id, titulo_puesto, activo, empresa_id, empresa(nombre_empresa)),
      perfil_postulante(id, nombre_completo, perfil_en_busqueda, telefono, ultima_conexion,
        carrera_otra, carrera:carrera_id(nombre), localidad_id, provincia_id,
        provincia(nombre),
        localidad(nombre, departamento_id, departamento(nombre)),
        usuario(email))
    `)
    .in('puesto_id', puestoIds)
    .order('fecha_postulacion', { ascending: false })

  // Step 2b: ciclo vigente de cada puesto. Viene ordenado por fecha_inicio desc,
  // así que el primero de cada puesto es el actual (esté abierto o cerrado: un
  // puesto cerrado sigue teniendo su último ciclo como el relevante).
  const { data: ciclos } = await admin
    .from('historial_puesto')
    .select('id, puesto_id, fecha_inicio')
    .in('puesto_id', puestoIds)
    .order('fecha_inicio', { ascending: false })

  const cicloActualPorPuesto = new Map<string, string>()
  for (const c of (ciclos ?? []) as { id: string; puesto_id: string }[]) {
    if (!cicloActualPorPuesto.has(c.puesto_id)) cicloActualPorPuesto.set(c.puesto_id, c.id)
  }

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

  // Step 3b: load technical skills per applicant
  const habilidadesPorPostulante = new Map<string, string[]>()
  if (postulanteIds.length > 0) {
    const { data: perfilesTecnicos } = await admin
      .from('perfil_tecnico')
      .select('postulante_id, postulante_competencia(competencia(nombre))')
      .in('postulante_id', postulanteIds)

    for (const pt of (perfilesTecnicos ?? []) as unknown[]) {
      const p = pt as {
        postulante_id: string
        postulante_competencia: { competencia: { nombre: string } | null }[]
      }
      habilidadesPorPostulante.set(
        p.postulante_id,
        p.postulante_competencia.map((pc) => pc.competencia?.nombre).filter((n): n is string => !!n),
      )
    }
  }

  return (postulaciones ?? []).map((row: unknown) => {
    const r = row as {
      id: string; estado: string; marca: MarcaPostulacion | null
      fecha_postulacion: string; updated_at: string
      postulante_id: string; puesto_id: string; historial_puesto_id: string
      motivo_descarte: string | null
      puesto: {
        id: string; titulo_puesto: string; activo: boolean
        empresa_id: string; empresa: { nombre_empresa: string } | null
      } | null
      perfil_postulante: {
        id: string; nombre_completo: string
        perfil_en_busqueda: boolean; telefono: string | null
        ultima_conexion: string | null
        carrera_otra: string | null
        carrera: { nombre: string } | null
        localidad_id: string | null
        provincia_id: string | null
        // Con los ids de la cadena: el tablero filtra por provincia y
        // departamento en memoria, sin volver a la base.
        provincia: { nombre: string } | null
        localidad: {
          nombre: string
          departamento_id: string
          departamento: { nombre: string } | null
        } | null
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
      marca: r.marca ?? null,
      fecha_postulacion: r.fecha_postulacion,
      updated_at: r.updated_at,
      puesto_id: r.puesto_id,
      titulo_puesto: r.puesto?.titulo_puesto,
      empresa_id: r.puesto?.empresa_id ?? null,
      nombre_empresa: r.puesto?.empresa?.nombre_empresa ?? null,
      // Cerrado = activo en false (las bajas lógicas ya quedaron filtradas antes).
      puesto_cerrado: r.puesto?.activo === false,
      postulante_id: r.postulante_id,
      nombre_completo: r.perfil_postulante?.nombre_completo,
      ultima_conexion: r.perfil_postulante?.ultima_conexion ?? null,
      carrera: r.perfil_postulante?.carrera?.nombre ?? r.perfil_postulante?.carrera_otra ?? null,
      localidad_id: r.perfil_postulante?.localidad_id ?? null,
      departamento_id: r.perfil_postulante?.localidad?.departamento_id ?? null,
      provincia_id: r.perfil_postulante?.provincia_id ?? null,
      nombre_provincia: r.perfil_postulante?.provincia?.nombre ?? null,
      nombre_localidad: r.perfil_postulante?.localidad?.nombre ?? null,
      habilidades: habilidadesPorPostulante.get(r.postulante_id) ?? [],
      contacto,
      tiene_nota: (notaCountMap.get(r.postulante_id) ?? 0) > 0,
      motivo_descarte: r.motivo_descarte,
      es_ciclo_actual: cicloActualPorPuesto.get(r.puesto_id) === r.historial_puesto_id,
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
  nombre_empresa: string | null
}

export type ReclutadorPublicoEmpresa = {
  id: string
  nombre_empresa: string
  descripcion: string | null
  link_url: string | null
}

export type ReclutadorPublico = {
  id: string
  nombre_reclutador: string
  /** Un reclutador puede trabajar para varias empresas; se listan las activas. */
  empresas: ReclutadorPublicoEmpresa[]
  puestos_activos: ReclutadorPublicoPuesto[]
}

export const getReclutadorPublico = cache(async (reclutadorId: string): Promise<ReclutadorPublico | null> => {
  const admin = createAdminClient()

  const { data } = await admin
    .from('perfil_reclutador')
    .select('id, nombre_reclutador')
    .eq('id', reclutadorId)
    .maybeSingle()

  if (!data) return null

  const r = data as { id: string; nombre_reclutador: string }

  const { data: vinculos } = await admin
    .from('reclutador_empresa')
    .select('empresa(id, nombre_empresa, descripcion, link_url, fecha_baja)')
    .eq('reclutador_id', reclutadorId)

  const empresas: ReclutadorPublicoEmpresa[] = ((vinculos ?? []) as unknown[])
    .map((v) => (v as {
      empresa: (ReclutadorPublicoEmpresa & { fecha_baja: string | null }) | null
    }).empresa)
    .filter((e): e is ReclutadorPublicoEmpresa & { fecha_baja: string | null } => !!e && !e.fecha_baja)
    .map(({ id, nombre_empresa, descripcion, link_url }) => ({ id, nombre_empresa, descripcion, link_url }))
    .sort((a, b) => a.nombre_empresa.localeCompare(b.nombre_empresa, 'es'))

  const { data: puestosData } = await admin
    .from('puesto')
    .select('id, titulo_puesto, ubicacion, carga_horaria, fecha_publicacion, descripcion_texto, nivel_experiencia, sector_industrial(nombre_sector), empresa(nombre_empresa)')
    .eq('reclutador_id', reclutadorId)
    .eq('activo', true)
    .order('fecha_publicacion', { ascending: false })

  const puestos: ReclutadorPublicoPuesto[] = (puestosData ?? []).map((row: unknown) => {
    const p = row as {
      id: string; titulo_puesto: string; ubicacion: string; carga_horaria: string
      fecha_publicacion: string; descripcion_texto: string | null; nivel_experiencia: string | null
      sector_industrial: { nombre_sector: string } | null
      empresa: { nombre_empresa: string } | null
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
      nombre_empresa: p.empresa?.nombre_empresa ?? null,
    }
  })

  return {
    id: r.id,
    nombre_reclutador: r.nombre_reclutador,
    empresas,
    puestos_activos: puestos,
  }
})
