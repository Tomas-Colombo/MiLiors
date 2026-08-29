import 'server-only'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { COMPETENCIAS } from '@/modules/informe/competencias'
import {
  VALORACION_COMPETENCIA,
  valorEnum,
  type ValoracionCompetencia,
} from '@/lib/constants/enums'
import { NIVELES_INFORME, type NivelCompetencia } from '@/lib/types/informe'
import { patronSinTildes } from '@/lib/texto'

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

export type SectorAdmin = {
  id: string
  nombre_sector: string
  fecha_baja_s: string | null
  created_at: string
}

export async function getSectoresAdmin(): Promise<SectorAdmin[]> {
  const admin = createAdminClient()
  return traerPaginado<SectorAdmin>(
    () =>
      admin
        .from('sector_industrial')
        .select('id, nombre_sector, fecha_baja_s, created_at')
        .order('nombre_sector'),
    'el catálogo de sectores',
  )
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
  return traerPaginado<CarreraAdmin>(
    () => admin.from('carrera').select('id, nombre, fecha_baja, created_at').order('nombre'),
    'el catálogo de carreras',
  )
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
  // Esta consulta devuelve una fila por POSTULANTE, no por carrera: crece con la
  // base de usuarios y es la primera de las de catálogo en pasar el corte de
  // PostgREST. El agregado se hace después, así que una página faltante se
  // llevaría carreras enteras del recuento sin avisar.
  const rows = await traerPaginado<{ carrera_otra: string | null; created_at: string }>(() => {
    let query = admin
      .from('perfil_postulante')
      .select('carrera_otra, created_at')
      .not('carrera_otra', 'is', null)

    if (params?.q) query = query.regexIMatch('carrera_otra', patronSinTildes(params.q))
    if (params?.desde) query = query.gte('created_at', params.desde)
    if (params?.hasta) query = query.lte('created_at', params.hasta)

    return query.order('id')
  }, 'las carreras cargadas por postulantes')

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

export type CompetenciaAdmin = { id: string; nombre: string; fecha_baja: string | null; created_at: string }

export async function getCompetenciasAdmin(): Promise<CompetenciaAdmin[]> {
  const admin = createAdminClient()
  // Paginada porque este catálogo lo hacen crecer los propios postulantes:
  // `guardarCompetenciasConCustom` da de alta cada texto libre nuevo.
  return traerPaginado<CompetenciaAdmin>(
    () => admin.from('competencia').select('id, nombre, fecha_baja, created_at').order('nombre'),
    'el catálogo de habilidades',
  )
}

export type CompetenciaUsoAdmin = {
  id: string
  nombre: string
  /** Cuántos perfiles técnicos la tienen cargada. */
  postulantes: number
  basico: number
  intermedio: number
  avanzado: number
  /** Alta en el catálogo. Las que un postulante escribió a mano se dan de alta al guardarlas. */
  createdAt: string
  activa: boolean
}

/**
 * Uso real del catálogo de habilidades: quién carga qué y con qué nivel.
 *
 * No existe una columna que diga si una habilidad la creó un admin o un
 * postulante: `guardarCompetenciasConCustom` da de alta el texto libre en la
 * MISMA tabla `competencia`, con la misma forma. Lo que sí se puede responder
 * —y es la pregunta útil— es cuáles usan efectivamente los postulantes y con
 * qué nivel; una habilidad con uso que no estaba en el catálogo inicial es,
 * justamente, una que trajo alguien de afuera.
 *
 * Devuelve sólo las que tienen al menos un uso: el catálogo completo —incluidas
 * las que nadie cargó— ya vive en `getCompetenciasAdmin`.
 */
export async function getCompetenciasUsoAdmin(): Promise<CompetenciaUsoAdmin[]> {
  const admin = createAdminClient()

  const filas = await traerPaginado<{
    nivel: string | null
    competencia: { id: string; nombre: string; created_at: string; fecha_baja: string | null } | null
  }>(
    () =>
      admin
        .from('postulante_competencia')
        .select('nivel, competencia(id, nombre, created_at, fecha_baja)')
        .order('id'),
    'el uso de habilidades',
  )

  const porId = new Map<string, CompetenciaUsoAdmin>()
  for (const f of filas) {
    const c = f.competencia
    if (!c) continue
    const actual = porId.get(c.id) ?? {
      id: c.id,
      nombre: c.nombre,
      postulantes: 0,
      basico: 0,
      intermedio: 0,
      avanzado: 0,
      createdAt: c.created_at,
      activa: !c.fecha_baja,
    }
    actual.postulantes += 1
    if (f.nivel === 'AVANZADO') actual.avanzado += 1
    else if (f.nivel === 'INTERMEDIO') actual.intermedio += 1
    else actual.basico += 1
    porId.set(c.id, actual)
  }

  // De mayor a menor uso: lo que hay que mirar primero es lo que más se carga.
  return [...porId.values()].sort(
    (a, b) => b.postulantes - a.postulantes || a.nombre.localeCompare(b.nombre, 'es'),
  )
}

// ─── Idiomas ─────────────────────────────────────────────────────────────────

export type IdiomaAdmin = { id: string; nombre: string; fecha_baja: string | null; created_at: string }

export async function getIdiomasAdmin(): Promise<IdiomaAdmin[]> {
  const admin = createAdminClient()
  return traerPaginado<IdiomaAdmin>(
    () => admin.from('idioma_catalogo').select('id, nombre, fecha_baja, created_at').order('nombre'),
    'el catálogo de idiomas',
  )
}

// ─── Postulantes ─────────────────────────────────────────────────────────────

export async function getPostulantesAdmin() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('perfil_postulante')
    .select(`
      id, nombre_completo, perfil_en_busqueda, created_at, carrera_id, carrera_otra,
      provincia_id,
      usuario(email),
      carrera:carrera_id(nombre),
      provincia(nombre),
      localidad(nombre, departamento_id, departamento(nombre)),
      test_eneagrama(test_eneagrama_dominante(id)),
      informe_personalidad(estado_informe)
    `)
    .order('created_at', { ascending: false })

  return (data ?? []).map((row: unknown) => {
    const r = row as {
      id: string; nombre_completo: string; perfil_en_busqueda: boolean; created_at: string
      carrera_id: string | null; carrera_otra: string | null
      provincia_id: string | null
      usuario: { email: string } | null
      carrera: { nombre: string } | null
      provincia: { nombre: string } | null
      localidad: {
        nombre: string
        departamento_id: string
        departamento: { nombre: string } | null
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
      // La provincia es el único nivel obligatorio y cuelga del perfil; el
      // departamento sólo existe si además cargó la localidad.
      departamento_id: r.localidad?.departamento_id ?? null,
      provincia_id: r.provincia_id,
      nombre_localidad: r.localidad?.nombre ?? null,
      nombre_provincia: r.provincia?.nombre ?? null,
      eneagrama_completo: (r.test_eneagrama?.test_eneagrama_dominante.length ?? 0) > 0,
      estado_informe: r.informe_personalidad?.estado_informe ?? null,
    }
  })
}

// ─── Empresas y reclutadores ─────────────────────────────────────────────────

export type EmpresaAdmin = {
  id: string
  nombre_empresa: string
  descripcion: string | null
  activa: boolean
  created_at: string
  reclutadores: { id: string; nombre: string; email: string | null }[]
}

export async function getEmpresasAdmin(): Promise<EmpresaAdmin[]> {
  const admin = createAdminClient()
  const data = await traerPaginado<unknown>(
    () =>
      admin
        .from('empresa')
        .select(`
      id, nombre_empresa, descripcion, fecha_baja, created_at,
      reclutador_empresa(perfil_reclutador(id, nombre_reclutador, usuario(email)))
    `)
        .order('created_at', { ascending: false })
        .order('id'),
    'el listado de empresas',
  )

  return data.map((row: unknown) => {
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

/**
 * Techo de filas de una consulta paginada de admin.
 *
 * Existe para que un export gigante falle de forma visible en vez de tumbar la
 * función: ExcelJS arma el libro entero en memoria, así que sin un tope el
 * archivo crece hasta donde llegue la RAM del runtime. Cuando se toca, la
 * pantalla y el .xlsx lo dicen — nunca se recorta en silencio.
 */
export const LIMITE_FILAS_CONSULTA = 50_000

/** Cuántas filas pide cada viaje. PostgREST corta cualquier página mayor. */
const PAGINA_SUPABASE = 1000

type QueryPaginable<T> = {
  range: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: unknown }>
}

/**
 * Trae TODAS las filas de una consulta, de a páginas.
 *
 * PostgREST corta cualquier select sin `range` en `db.max_rows` (1000 por
 * defecto en Supabase) y devuelve esa página sin error ni aviso. Un select
 * pelado sobre `feedback_informe_competencia` empieza a mentir a partir de ~77
 * postulantes (13 valoraciones cada uno), y lo peor no es que falten filas:
 * es que los porcentajes y el sesgo se calculan sobre una muestra recortada
 * por fecha de carga, y nadie se entera.
 */
async function traerPaginado<T>(
  construir: () => QueryPaginable<T>,
  contexto: string,
): Promise<T[]> {
  const filas: T[] = []

  for (let desde = 0; desde < LIMITE_FILAS_CONSULTA; desde += PAGINA_SUPABASE) {
    const hasta = Math.min(desde + PAGINA_SUPABASE, LIMITE_FILAS_CONSULTA) - 1
    const { data, error } = await construir().range(desde, hasta)
    if (error) {
      logFeedbackError(contexto, error)
      break
    }
    const pagina = data ?? []
    filas.push(...pagina)
    // Página incompleta = no hay más. Evita un viaje de más en el caso normal.
    if (pagina.length < hasta - desde + 1) break
  }

  if (filas.length >= LIMITE_FILAS_CONSULTA) {
    console.warn(`[admin/feedback] ${contexto}: se alcanzó el techo de ${LIMITE_FILAS_CONSULTA} filas.`)
  }
  return filas
}

/** Eneatipo dominante por postulante. Se resuelve aparte para no anidar 4 embeds. */
const LOTE_IDS = 200

async function eneatipoPorPostulante(postulanteIds: string[]): Promise<Record<string, number | null>> {
  if (postulanteIds.length === 0) return {}
  const admin = createAdminClient()
  const mapa: Record<string, number | null> = {}

  // De a lotes: `.in()` viaja como query string y un UUID ocupa ~37 caracteres.
  // Con unos pocos miles de ids la URL supera el límite del proxy y la consulta
  // falla entera, no parcialmente.
  for (let i = 0; i < postulanteIds.length; i += LOTE_IDS) {
    const lote = postulanteIds.slice(i, i + LOTE_IDS)
    const { data, error } = await admin
      .from('perfil_postulante')
      .select('id, test_eneagrama(test_eneagrama_dominante(eneatipo(numero_eneatipo)))')
      .in('id', lote)

    if (error) {
      logFeedbackError('el eneatipo de los postulantes', error)
      continue
    }

    for (const row of (data ?? []) as unknown[]) {
      const r = row as {
        id: string
        test_eneagrama: { test_eneagrama_dominante: { eneatipo: { numero_eneatipo: number } }[] } | null
      }
      mapa[r.id] = r.test_eneagrama?.test_eneagrama_dominante?.[0]?.eneatipo?.numero_eneatipo ?? null
    }
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
 * de la pantalla como el .xlsx: una sola fuente para que lo que se exporta sea
 * exactamente lo que se ve.
 *
 * PENDIENTE — agregar en SQL cuando el volumen lo pida.
 * Devuelve el DETALLE completo, y `/admin/feedback` lo usa sólo para reducirlo a
 * 13 filas con `agregarPorCompetencia`. Con 13 valoraciones por postulante eso
 * son ~1 viaje a la base cada 1000 filas (ver `traerPaginado`): a 4.000
 * postulantes, ~52 viajes en CADA carga de la página, para mostrar 13 renglones.
 * El export sí necesita el detalle — la pantalla no.
 *
 * El arreglo es una vista o RPC que devuelva los agregados ya calculados
 * (competencia, total, subestima, justo, sobrestima) y que la pantalla la use en
 * lugar de esta función; el export sigue con el detalle. Disparador sugerido:
 * cuando `contarFeedbackCompetencias()` pase de unos pocos miles.
 */
export async function getFeedbackCompetenciasAdmin(
  filtros: FeedbackFiltros = {},
): Promise<FeedbackCompetenciaRow[]> {
  const admin = createAdminClient()

  // `nivel_mostrado` guarda el nivel del INFORME (Alto…Bajo), no el de las
  // habilidades técnicas del perfil. Validar contra NIVEL_COMPETENCIA hacía que
  // valorEnum devolviera null y el filtro se descartara sin avisar.
  const nivel = valorEnum(NIVELES_INFORME, filtros.nivel)
  const valoracion = valorEnum(VALORACION_COMPETENCIA, filtros.valoracion)
  const rango = rangoISO(filtros)

  // La consulta se reconstruye en cada página: un builder de PostgREST no se
  // puede reutilizar después de ejecutarlo.
  const filas = await traerPaginado<{
    id: string
    postulante_id: string
    competencia_key: string
    nivel_mostrado: string
    valoracion: ValoracionCompetencia
    informe_generado_at: string
    updated_at: string
  }>(() => {
    let query = admin
      .from('feedback_informe_competencia')
      .select('id, postulante_id, competencia_key, nivel_mostrado, valoracion, informe_generado_at, updated_at')

    if (filtros.competencia) query = query.eq('competencia_key', filtros.competencia)
    if (nivel) query = query.eq('nivel_mostrado', nivel)
    if (valoracion) query = query.eq('valoracion', valoracion)
    if (rango.desde) query = query.gte('updated_at', rango.desde)
    if (rango.hasta) query = query.lte('updated_at', rango.hasta)

    // Desempate por id: sin un orden total, dos filas con el mismo `updated_at`
    // pueden caer en páginas distintas y aparecer repetidas o perderse.
    return query.order('updated_at', { ascending: false }).order('id')
  }, 'valoraciones por competencia')

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
  const rango = rangoISO(filtros)

  const filas = await traerPaginado<{
    id: string
    postulante_id: string
    representatividad: number
    comentario: string | null
    updated_at: string
  }>(() => {
    let query = admin
      .from('feedback_informe')
      .select('id, postulante_id, representatividad, comentario, updated_at')

    if (rango.desde) query = query.gte('updated_at', rango.desde)
    if (rango.hasta) query = query.lte('updated_at', rango.hasta)

    return query.order('updated_at', { ascending: false }).order('id')
  }, 'las respuestas globales')

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

/**
 * Diagnóstico accionable a partir del sesgo, para no obligar a nadie a recordar
 * qué significaba el signo. Los cortes son los mismos que pinta la tabla.
 */
export function diagnosticoSesgo(a: { sesgo: number; justo: number; total: number }): string {
  // Un sesgo cerca de cero también sale de un empate 50/50 sin nadie conforme:
  // eso NO es estar calibrado, es una competencia partida al medio.
  const pctJusto = a.total === 0 ? 0 : (a.justo / a.total) * 100
  if (Math.abs(a.sesgo) < 15 && pctJusto < 40) return 'Polarizada: revisar el criterio'
  if (a.sesgo >= 30) return 'Subir el peso (muy corta)'
  if (a.sesgo >= 15) return 'Subir el peso'
  if (a.sesgo <= -30) return 'Bajar el peso (muy alta)'
  if (a.sesgo <= -15) return 'Bajar el peso'
  return 'Calibrada'
}

export type AgregadoNivel = AgregadoCompetencia & { nivel: NivelCompetencia }

/**
 * Mismo agregado, pero abierto por el nivel que la persona tenía DELANTE al
 * opinar. Es el corte que distingue dos correcciones muy distintas: si una
 * competencia se queja sólo cuando se muestra en Alto, el problema es el factor
 * de contraste; si se queja en todos los niveles por igual, es su peso en la
 * matriz eneatipo→competencia.
 */
export function agregarPorCompetenciaYNivel(rows: FeedbackCompetenciaRow[]): AgregadoNivel[] {
  const porClave = new Map<string, AgregadoNivel>()

  for (const r of rows) {
    const clave = `${r.competenciaKey}|${r.nivelMostrado}`
    const actual = porClave.get(clave) ?? {
      key: r.competenciaKey,
      nombre: r.competenciaNombre,
      nivel: r.nivelMostrado as NivelCompetencia,
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
    porClave.set(clave, actual)
  }

  const ordenNivel = new Map(NIVELES_INFORME.map((n, i) => [n, i]))

  return [...porClave.values()]
    .map(a => ({ ...a, sesgo: Math.round(((a.subestima - a.sobrestima) / a.total) * 100) }))
    // Agrupadas por competencia y, dentro, de Alto a Bajo: así se lee de corrido
    // si el problema aparece solo en un extremo de la escala.
    .sort(
      (a, b) =>
        a.nombre.localeCompare(b.nombre, 'es') ||
        (ordenNivel.get(a.nivel) ?? 99) - (ordenNivel.get(b.nivel) ?? 99),
    )
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
