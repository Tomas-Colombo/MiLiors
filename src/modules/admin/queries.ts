import 'server-only'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { COMPETENCIAS } from '@/modules/informe/competencias'
import {
  NIVEL_COMPETENCIA,
  VALORACION_COMPETENCIA,
  valorEnum,
  type ValoracionCompetencia,
} from '@/lib/constants/enums'

// ─── Métricas del dashboard ──────────────────────────────────────────────────

export async function getMetricas() {
  const admin = createAdminClient()

  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [
    { count: totalPostulantes },
    { count: postulantesBusqueda },
    { count: informesListo },
    { count: informesPendiente },
    { count: informesError },
    { count: totalReclutadores },
    { count: totalEmpresas },
    { count: puestosActivos },
    { count: puestosCerrados },
    { count: consultasIAEsteMes },
  ] = await Promise.all([
    admin.from('perfil_postulante').select('*', { count: 'exact', head: true }),
    admin.from('perfil_postulante').select('*', { count: 'exact', head: true }).eq('perfil_en_busqueda', true),
    admin.from('informe_personalidad').select('*', { count: 'exact', head: true }).eq('estado_informe', 'LISTO'),
    admin.from('informe_personalidad').select('*', { count: 'exact', head: true }).eq('estado_informe', 'PENDIENTE'),
    admin.from('informe_personalidad').select('*', { count: 'exact', head: true }).eq('estado_informe', 'ERROR'),
    admin.from('perfil_reclutador').select('*', { count: 'exact', head: true }).is('fecha_baja', null),
    admin.from('empresa').select('*', { count: 'exact', head: true }).is('fecha_baja', null),
    admin.from('puesto').select('*', { count: 'exact', head: true }).eq('activo', true),
    admin.from('puesto').select('*', { count: 'exact', head: true }).eq('activo', false),
    admin.from('consulta_asistente_ia').select('*', { count: 'exact', head: true }).gte('fecha_consulta', inicioMes),
  ])

  return {
    totalPostulantes: totalPostulantes ?? 0,
    postulantesBusqueda: postulantesBusqueda ?? 0,
    informesListo: informesListo ?? 0,
    informesError: informesError ?? 0,
    informesPendiente: informesPendiente ?? 0,
    totalReclutadores: totalReclutadores ?? 0,
    totalEmpresas: totalEmpresas ?? 0,
    puestosActivos: puestosActivos ?? 0,
    puestosCerrados: puestosCerrados ?? 0,
    consultasIAEsteMes: consultasIAEsteMes ?? 0,
  }
}

// ─── Sectores ────────────────────────────────────────────────────────────────

export async function getSectoresAdmin() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('sector_industrial')
    .select('id, nombre_sector, fecha_baja_s, created_at')
    .order('nombre_sector')
  return (data ?? []) as { id: string; nombre_sector: string; fecha_baja_s: string | null; created_at: string }[]
}

// ─── Ubicación: provincias y localidades ─────────────────────────────────────

export type ProvinciaAdmin = {
  id: string
  nombre: string
  codigo_indec: string | null
  fecha_baja: string | null
  created_at: string
}

export async function getProvinciasAdmin(): Promise<ProvinciaAdmin[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('provincia')
    .select('id, nombre, codigo_indec, fecha_baja, created_at')
    .order('nombre')
  return (data ?? []) as ProvinciaAdmin[]
}

export type DepartamentoAdmin = {
  id: string
  nombre: string
  fecha_baja: string | null
  created_at: string
}

export async function getDepartamentosAdmin(provinciaId: string): Promise<DepartamentoAdmin[]> {
  if (!provinciaId) return []
  const admin = createAdminClient()
  const { data } = await admin
    .from('departamento')
    .select('id, nombre, fecha_baja, created_at')
    .eq('provincia_id', provinciaId)
    .order('nombre')
  return (data ?? []) as DepartamentoAdmin[]
}

export type LocalidadAdmin = {
  id: string
  nombre: string
  fecha_baja: string | null
  created_at: string
}

export async function getLocalidadesAdmin(departamentoId: string): Promise<LocalidadAdmin[]> {
  if (!departamentoId) return []
  const admin = createAdminClient()
  const { data } = await admin
    .from('localidad')
    .select('id, nombre, fecha_baja, created_at')
    .eq('departamento_id', departamentoId)
    .order('nombre')
  return (data ?? []) as LocalidadAdmin[]
}

// ─── Carreras ────────────────────────────────────────────────────────────────

export type CarreraAdmin = {
  id: string
  nombre: string
  fecha_baja: string | null
  created_at: string
}

export async function getCarrerasAdmin(): Promise<CarreraAdmin[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('carrera')
    .select('id, nombre, fecha_baja, created_at')
    .order('nombre')
  return (data ?? []) as CarreraAdmin[]
}

export type CarreraOtraAdmin = {
  nombre: string
  cantidad: number
  primeraFecha: string
}

export async function getCarrerasOtrasAdmin(params?: {
  q?: string
  desde?: string
  hasta?: string
}): Promise<CarreraOtraAdmin[]> {
  const admin = createAdminClient()
  let query = admin
    .from('perfil_postulante')
    .select('carrera_otra, created_at')
    .not('carrera_otra', 'is', null)

  if (params?.q) query = query.ilike('carrera_otra', `%${params.q}%`)
  if (params?.desde) query = query.gte('created_at', params.desde)
  if (params?.hasta) query = query.lte('created_at', params.hasta)

  const { data } = await query
  const rows = (data ?? []) as { carrera_otra: string | null; created_at: string }[]

  const agregados = new Map<string, { cantidad: number; primeraFecha: string }>()
  for (const r of rows) {
    if (!r.carrera_otra) continue
    const nombre = r.carrera_otra
    const actual = agregados.get(nombre)
    if (!actual) {
      agregados.set(nombre, { cantidad: 1, primeraFecha: r.created_at })
    } else {
      actual.cantidad += 1
      if (r.created_at < actual.primeraFecha) actual.primeraFecha = r.created_at
    }
  }

  return Array.from(agregados.entries())
    .map(([nombre, { cantidad, primeraFecha }]) => ({ nombre, cantidad, primeraFecha }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
}

// ─── Competencias ────────────────────────────────────────────────────────────

export async function getCompetenciasAdmin() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('competencia')
    .select('id, nombre, fecha_baja, created_at')
    .order('nombre')
  return (data ?? []) as { id: string; nombre: string; fecha_baja: string | null; created_at: string }[]
}

// ─── Idiomas ─────────────────────────────────────────────────────────────────

export async function getIdiomasAdmin() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('idioma_catalogo')
    .select('id, nombre, fecha_baja, created_at')
    .order('nombre')
  return (data ?? []) as { id: string; nombre: string; fecha_baja: string | null; created_at: string }[]
}

// ─── Postulantes ─────────────────────────────────────────────────────────────

export async function getPostulantesAdmin() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('perfil_postulante')
    .select(`
      id, nombre_completo, perfil_en_busqueda, created_at, carrera_id, carrera_otra,
      usuario(email),
      carrera:carrera_id(nombre),
      localidad(nombre, departamento_id, departamento(nombre, provincia_id, provincia(nombre))),
      test_eneagrama(test_eneagrama_dominante(id)),
      informe_personalidad(estado_informe)
    `)
    .order('created_at', { ascending: false })

  return (data ?? []).map((row: unknown) => {
    const r = row as {
      id: string; nombre_completo: string; perfil_en_busqueda: boolean; created_at: string
      carrera_id: string | null; carrera_otra: string | null
      usuario: { email: string } | null
      carrera: { nombre: string } | null
      localidad: {
        nombre: string
        departamento_id: string
        departamento: { nombre: string; provincia_id: string; provincia: { nombre: string } | null } | null
      } | null
      test_eneagrama: { test_eneagrama_dominante: { id: string }[] } | null
      informe_personalidad: { estado_informe: string } | null
    }
    return {
      id: r.id,
      nombre_completo: r.nombre_completo,
      perfil_en_busqueda: r.perfil_en_busqueda,
      created_at: r.created_at,
      email: r.usuario?.email ?? null,
      carrera_id: r.carrera_id,
      // La carrera puede venir del catálogo o cargada a mano ("otra").
      carrera: r.carrera?.nombre ?? r.carrera_otra ?? null,
      es_carrera_otra: !r.carrera_id && !!r.carrera_otra,
      // Cadena de ubicación: el perfil sólo guarda la localidad.
      departamento_id: r.localidad?.departamento_id ?? null,
      provincia_id: r.localidad?.departamento?.provincia_id ?? null,
      nombre_localidad: r.localidad?.nombre ?? null,
      nombre_provincia: r.localidad?.departamento?.provincia?.nombre ?? null,
      eneagrama_completo: (r.test_eneagrama?.test_eneagrama_dominante.length ?? 0) > 0,
      estado_informe: r.informe_personalidad?.estado_informe ?? null,
    }
  })
}

// ─── Empresas y reclutadores ─────────────────────────────────────────────────

export async function getEmpresasAdmin() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('empresa')
    .select(`
      id, nombre_empresa, descripcion, fecha_baja, created_at,
      reclutador_empresa(perfil_reclutador(id, nombre_reclutador, usuario(email)))
    `)
    .order('created_at', { ascending: false })

  return (data ?? []).map((row: unknown) => {
    const r = row as {
      id: string; nombre_empresa: string; descripcion: string | null
      fecha_baja: string | null; created_at: string
      reclutador_empresa: {
        perfil_reclutador: { id: string; nombre_reclutador: string; usuario: { email: string } | null } | null
      }[]
    }
    return {
      id: r.id,
      nombre_empresa: r.nombre_empresa,
      descripcion: r.descripcion,
      activa: !r.fecha_baja,
      created_at: r.created_at,
      reclutadores: r.reclutador_empresa
        .map(v => v.perfil_reclutador)
        .filter((rec): rec is { id: string; nombre_reclutador: string; usuario: { email: string } | null } => !!rec)
        .map(rec => ({
          id: rec.id,
          nombre: rec.nombre_reclutador,
          email: rec.usuario?.email ?? null,
        })),
    }
  })
}

// ─── Preguntas eneagrama ─────────────────────────────────────────────────────

export async function getPreguntasAdmin() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('pregunta_eneagrama')
    .select('id, numero_pregunta, enunciado, eneatipo_asociado, fecha_creacion, codigo_original, fecha_baja, pausada')
    .order('numero_pregunta')
  return (data ?? []) as {
    id: string
    numero_pregunta: number
    enunciado: string
    eneatipo_asociado: number
    fecha_creacion: string
    codigo_original: string | null
    fecha_baja: string | null
    pausada: boolean
  }[]
}

// ─── Términos y Condiciones ──────────────────────────────────────────────────

export async function getTyCVersiones() {
  const admin = createAdminClient()
  const [{ data: versiones }, { data: aceptaciones }] = await Promise.all([
    admin
      .from('terminos_y_condiciones')
      .select('id, version, descripcion, fecha_publicacion, fecha_baja_tyc')
      .order('fecha_publicacion', { ascending: false }),
    admin.from('aceptacion_tyc').select('tyc_id'),
  ])

  const conteo = new Map<string, number>()
  for (const a of (aceptaciones ?? []) as { tyc_id: string }[]) {
    conteo.set(a.tyc_id, (conteo.get(a.tyc_id) ?? 0) + 1)
  }

  return ((versiones ?? []) as {
    id: string
    version: string
    descripcion: string
    fecha_publicacion: string
    fecha_baja_tyc: string | null
  }[]).map(v => ({ ...v, aceptaciones: conteo.get(v.id) ?? 0 }))
}

// ─── Monitor de informes ─────────────────────────────────────────────────────

export async function getInformesAdmin() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('informe_personalidad')
    .select(`
      id, estado_informe, fecha_generacion, updated_at,
      perfil_postulante(nombre_completo, usuario(email))
    `)
    .order('updated_at', { ascending: false })

  return (data ?? []).map((row: unknown) => {
    const r = row as {
      id: string; estado_informe: string; fecha_generacion: string; updated_at: string
      perfil_postulante: { nombre_completo: string; usuario: { email: string } | null } | null
    }
    return {
      id: r.id,
      estado_informe: r.estado_informe,
      fecha_generacion: r.fecha_generacion,
      updated_at: r.updated_at,
      nombre_completo: r.perfil_postulante?.nombre_completo ?? '—',
      email: r.perfil_postulante?.usuario?.email ?? null,
    }
  })
}

// ─── Feedback del informe (calibración del motor) ─────────────────────────────
//
// Insumo para ajustar la matriz eneatipo→competencia y FACTOR_CONTRASTE con
// datos reales en vez de a ojo. Deliberadamente SEUDÓNIMO: se expone
// `postulante_id` para poder agrupar, nunca nombre ni email. Es telemetría del
// modelo, no una ficha de la persona.

export type { ValoracionCompetencia } from '@/lib/constants/enums'

export type FeedbackCompetenciaRow = {
  id: string
  postulanteId: string
  eneatipo: number | null
  competenciaKey: string
  competenciaNombre: string
  nivelMostrado: string
  valoracion: ValoracionCompetencia
  respondidoAt: string
  informeGeneradoAt: string
}

export type FeedbackGlobalRow = {
  id: string
  postulanteId: string
  eneatipo: number | null
  representatividad: number
  comentario: string | null
  respondidoAt: string
}

export type FeedbackFiltros = {
  eneatipo?: string
  competencia?: string
  nivel?: string
  valoracion?: string
  /** Atajo: ventana en días sobre la fecha de respuesta. Vacío = todo el histórico. */
  dias?: string
  /** Rango explícito 'YYYY-MM-DD'. Si viene alguno de los dos, pisa a `dias`. */
  desde?: string
  hasta?: string
}

const NOMBRE_POR_KEY: Record<string, string> = Object.fromEntries(
  COMPETENCIAS.map(c => [c.key, c.nombre]),
)

/**
 * Una consulta fallida y una tabla vacía llegan iguales a la pantalla (`data ??
 * []`), así que el estado vacío por sí solo no distingue "todavía nadie opinó"
 * de "las migraciones no están aplicadas". Al menos que quede en el log.
 */
function logFeedbackError(contexto: string, error: unknown): void {
  console.error(`[admin/feedback] Error al leer ${contexto}:`, error)
}

/** Eneatipo dominante por postulante. Se resuelve aparte para no anidar 4 embeds. */
async function eneatipoPorPostulante(postulanteIds: string[]): Promise<Record<string, number | null>> {
  if (postulanteIds.length === 0) return {}
  const admin = createAdminClient()

  const { data } = await admin
    .from('perfil_postulante')
    .select('id, test_eneagrama(test_eneagrama_dominante(eneatipo(numero_eneatipo)))')
    .in('id', postulanteIds)

  const mapa: Record<string, number | null> = {}
  for (const row of (data ?? []) as unknown[]) {
    const r = row as {
      id: string
      test_eneagrama: { test_eneagrama_dominante: { eneatipo: { numero_eneatipo: number } }[] } | null
    }
    mapa[r.id] = r.test_eneagrama?.test_eneagrama_dominante?.[0]?.eneatipo?.numero_eneatipo ?? null
  }
  return mapa
}

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Corte temporal sobre la fecha de respuesta, en ISO.
 *
 * El rango explícito tiene prioridad sobre el atajo de días: si el admin se tomó
 * el trabajo de tipear fechas, un preset olvidado en la URL no debería recortarlas.
 * `hasta` se extiende al final del día para que el rango sea inclusivo — elegir
 * "hasta el 12" y no ver lo cargado ese mismo día sería un bug silencioso.
 */
function rangoISO(filtros: FeedbackFiltros): { desde: string | null; hasta: string | null } {
  const desdeOk = FECHA_RE.test(filtros.desde ?? '')
  const hastaOk = FECHA_RE.test(filtros.hasta ?? '')

  if (desdeOk || hastaOk) {
    return {
      desde: desdeOk ? new Date(`${filtros.desde}T00:00:00.000Z`).toISOString() : null,
      hasta: hastaOk ? new Date(`${filtros.hasta}T23:59:59.999Z`).toISOString() : null,
    }
  }

  const n = parseInt(filtros.dias ?? '', 10)
  if (Number.isFinite(n) && n > 0) {
    return { desde: new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString(), hasta: null }
  }
  return { desde: null, hasta: null }
}

/**
 * Valoraciones por competencia, ya filtradas. Alimenta tanto la tabla agregada
 * de la pantalla como el CSV: una sola fuente para que lo que se exporta sea
 * exactamente lo que se ve.
 */
export async function getFeedbackCompetenciasAdmin(
  filtros: FeedbackFiltros = {},
): Promise<FeedbackCompetenciaRow[]> {
  const admin = createAdminClient()

  let query = admin
    .from('feedback_informe_competencia')
    .select('id, postulante_id, competencia_key, nivel_mostrado, valoracion, informe_generado_at, updated_at')

  if (filtros.competencia) query = query.eq('competencia_key', filtros.competencia)
  const nivel = valorEnum(NIVEL_COMPETENCIA, filtros.nivel)
  if (nivel) query = query.eq('nivel_mostrado', nivel)
  const valoracion = valorEnum(VALORACION_COMPETENCIA, filtros.valoracion)
  if (valoracion) query = query.eq('valoracion', valoracion)
  const rango = rangoISO(filtros)
  if (rango.desde) query = query.gte('updated_at', rango.desde)
  if (rango.hasta) query = query.lte('updated_at', rango.hasta)

  const { data, error } = await query.order('updated_at', { ascending: false })
  if (error) logFeedbackError('valoraciones por competencia', error)

  const filas = (data ?? []) as {
    id: string
    postulante_id: string
    competencia_key: string
    nivel_mostrado: string
    valoracion: ValoracionCompetencia
    informe_generado_at: string
    updated_at: string
  }[]

  const eneatipos = await eneatipoPorPostulante([...new Set(filas.map(f => f.postulante_id))])

  const rows = filas.map(f => ({
    id: f.id,
    postulanteId: f.postulante_id,
    eneatipo: eneatipos[f.postulante_id] ?? null,
    competenciaKey: f.competencia_key,
    competenciaNombre: NOMBRE_POR_KEY[f.competencia_key] ?? f.competencia_key,
    nivelMostrado: f.nivel_mostrado,
    valoracion: f.valoracion,
    respondidoAt: f.updated_at,
    informeGeneradoAt: f.informe_generado_at,
  }))

  // El eneatipo no vive en esta tabla, así que se filtra después de resolverlo.
  const eneatipoFiltro = parseInt(filtros.eneatipo ?? '', 10)
  return Number.isFinite(eneatipoFiltro)
    ? rows.filter(r => r.eneatipo === eneatipoFiltro)
    : rows
}

/**
 * Total histórico de valoraciones, para el contador "X de Y" de los filtros.
 * Es un count y no un `getFeedbackCompetenciasAdmin()` sin filtros: ese traería
 * todas las filas y resolvería el eneatipo de cada postulante sólo para contarlas.
 */
export async function contarFeedbackCompetencias(): Promise<number> {
  const admin = createAdminClient()
  const { count, error } = await admin
    .from('feedback_informe_competencia')
    .select('*', { count: 'exact', head: true })
  if (error) logFeedbackError('el total de valoraciones', error)
  return count ?? 0
}

/**
 * Total histórico de respuestas globales, sin filtros. Junto con
 * `contarFeedbackCompetencias` distingue "todavía no opinó nadie" de "opinaron,
 * pero sólo la pregunta de cierre".
 */
export async function contarFeedbackGlobal(): Promise<number> {
  const admin = createAdminClient()
  const { count, error } = await admin
    .from('feedback_informe')
    .select('*', { count: 'exact', head: true })
  if (error) logFeedbackError('el total de respuestas globales', error)
  return count ?? 0
}

/** Respuestas a la pregunta global de cierre, con los mismos filtros aplicables. */
export async function getFeedbackGlobalAdmin(
  filtros: FeedbackFiltros = {},
): Promise<FeedbackGlobalRow[]> {
  const admin = createAdminClient()

  let query = admin
    .from('feedback_informe')
    .select('id, postulante_id, representatividad, comentario, updated_at')

  const rango = rangoISO(filtros)
  if (rango.desde) query = query.gte('updated_at', rango.desde)
  if (rango.hasta) query = query.lte('updated_at', rango.hasta)

  const { data, error } = await query.order('updated_at', { ascending: false })
  if (error) logFeedbackError('las respuestas globales', error)

  const filas = (data ?? []) as {
    id: string
    postulante_id: string
    representatividad: number
    comentario: string | null
    updated_at: string
  }[]

  const eneatipos = await eneatipoPorPostulante([...new Set(filas.map(f => f.postulante_id))])

  const rows = filas.map(f => ({
    id: f.id,
    postulanteId: f.postulante_id,
    eneatipo: eneatipos[f.postulante_id] ?? null,
    representatividad: f.representatividad,
    comentario: f.comentario,
    respondidoAt: f.updated_at,
  }))

  const eneatipoFiltro = parseInt(filtros.eneatipo ?? '', 10)
  return Number.isFinite(eneatipoFiltro)
    ? rows.filter(r => r.eneatipo === eneatipoFiltro)
    : rows
}

export type AgregadoCompetencia = {
  key: string
  nombre: string
  total: number
  subestima: number
  justo: number
  sobrestima: number
  /**
   * (%subestima − %sobrestima). Positivo = el motor le queda CORTO a la gente y
   * habría que subir el peso; negativo = se pasa. Cerca de 0 = calibrada.
   */
  sesgo: number
}

/** Agrega por competencia y ordena por |sesgo|: primero lo peor calibrado. */
export function agregarPorCompetencia(rows: FeedbackCompetenciaRow[]): AgregadoCompetencia[] {
  const porKey = new Map<string, AgregadoCompetencia>()

  for (const r of rows) {
    const actual = porKey.get(r.competenciaKey) ?? {
      key: r.competenciaKey,
      nombre: r.competenciaNombre,
      total: 0,
      subestima: 0,
      justo: 0,
      sobrestima: 0,
      sesgo: 0,
    }
    actual.total += 1
    if (r.valoracion === 'SUBESTIMA') actual.subestima += 1
    else if (r.valoracion === 'JUSTO') actual.justo += 1
    else actual.sobrestima += 1
    porKey.set(r.competenciaKey, actual)
  }

  return [...porKey.values()]
    .map(a => ({ ...a, sesgo: Math.round(((a.subestima - a.sobrestima) / a.total) * 100) }))
    .sort((a, b) => Math.abs(b.sesgo) - Math.abs(a.sesgo))
}
