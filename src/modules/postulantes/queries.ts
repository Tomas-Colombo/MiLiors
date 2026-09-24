import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { patronSinTildes } from '@/lib/texto'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import type { AnexoReclutador, InformePersonalidadJSON } from '@/lib/types/informe'

/** UUID v4-ish check — used to distinguish real carrera ids from the 'OTRAS' sentinel */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type PostulanteCard = {
  id: string
  nombre_completo: string
  carrera: string | null
  perfil_en_busqueda: boolean
  eneatipo_numero: number | null
  eneatipo_nombre: string | null
  competencias: { nombre: string }[]
  nombre_provincia: string | null
  nombre_localidad: string | null
}

export type PostulanteDetalle = PostulanteCard & {
  // Contacto: solo se incluye si hay autorización
  email: string | null
  telefono: string | null
  enlace_linkedin: string | null
  portfolio: string | null
  ultima_conexion: string | null
  // Perfil técnico
  formaciones: { titulo: string; institucion: string; fecha_graduacion: string | null }[]
  cursos: { nombre: string; institucion: string; fecha_fin: string | null; duracion_horas: number | null; url_credencial: string | null }[]
  /** `descripcion` son las tareas del puesto, tal como las carga el postulante. */
  experiencias: {
    puesto: string
    empresa: string
    fecha_inicio: string
    fecha_fin: string | null
    descripcion: string | null
  }[]
  idiomas: { nombre: string; nivel_idioma: string }[]
  /** Departamento de la localidad, cuando el perfil bajó hasta ese nivel. */
  nombre_departamento: string | null
  // Informe (solo si perfil_en_busqueda y estado LISTO)
  informe: InformePersonalidadJSON | null
  /** Anexo del reclutador (preguntas STAR y guía). Mismo criterio de visibilidad que el informe. */
  anexo: AnexoReclutador | null
}

/**
 * Embeds de ubicación. La provincia cuelga directo del perfil porque es el
 * único nivel obligatorio; la localidad es opcional y puede faltar.
 */
type LocalidadEmbed = { nombre: string }
type ProvinciaEmbed = { nombre: string }

/** Buscar postulantes con perfil_en_busqueda=true */
export const buscarPostulantes = cache(async (filtros?: {
  competenciaId?: string
  busqueda?: string
  provinciaId?: string
  departamentoId?: string
  carrera?: string
  carreraOtra?: string
}): Promise<PostulanteCard[]> => {
  const supabase = await createClient()

  // Filtrar por departamento exige que el embed de localidad sea un JOIN
  // interno. Sin ese filtro se deja LEFT: la localidad es opcional, y un perfil
  // que sólo cargó la provincia tiene que seguir apareciendo en la búsqueda.
  const embedUbicacion = filtros?.departamentoId
    ? 'localidad!inner(nombre)'
    : 'localidad(nombre)'

  // Query base: perfil_postulante en búsqueda con eneatipo
  let query = supabase
    .from('perfil_postulante')
    .select(`
      id, nombre_completo, carrera_otra, carrera:carrera_id(nombre), perfil_en_busqueda, localidad_id,
      provincia(nombre), ${embedUbicacion},
      test_eneagrama(tiene_empate_dominante, test_eneagrama_dominante(eneatipo(numero_eneatipo, nombre)))
    `)
    .eq('perfil_en_busqueda', true)

  // `regexIMatch` y no `ilike`: ilike distingue tildes, así que buscar "gonzalez"
  // no encontraba a "González". El patrón acepta la vocal con y sin acento.
  if (filtros?.busqueda) {
    query = query.regexIMatch('nombre_completo', patronSinTildes(filtros.busqueda))
  }
  // La provincia se filtra por la columna del perfil; el departamento, sobre el
  // embed, porque cuelga de la localidad.
  if (filtros?.provinciaId) query = query.eq('provincia_id', filtros.provinciaId)
  if (filtros?.departamentoId) query = query.eq('localidad.departamento_id', filtros.departamentoId)
  if (filtros?.carrera && UUID_RE.test(filtros.carrera)) {
    query = query.eq('carrera_id', filtros.carrera)
  }
  if (filtros?.carreraOtra) {
    query = query.regexIMatch('carrera_otra', patronSinTildes(filtros.carreraOtra))
  }

  const { data: postulantes } = await query

  if (!postulantes || postulantes.length === 0) return []

  // Cargar competencias en paralelo para cada postulante
  const postulanteIds = (postulantes as unknown[]).map((p) => (p as { id: string }).id)

  const { data: perfilesTecnicos } = await supabase
    .from('perfil_tecnico')
    .select('postulante_id, postulante_competencia(competencia(id, nombre))')
    .in('postulante_id', postulanteIds)

  const competenciasPorPostulante: Record<string, { id: string; nombre: string }[]> = {}
  for (const pt of (perfilesTecnicos ?? []) as unknown[]) {
    const p = pt as {
      postulante_id: string
      postulante_competencia: { competencia: { id: string; nombre: string } | null }[]
    }
    competenciasPorPostulante[p.postulante_id] = p.postulante_competencia
      .map((pc) => pc.competencia)
      .filter((c): c is { id: string; nombre: string } => c !== null)
  }

  // Filtro por competencia: sólo candidatos que tienen esa competencia cargada
  const filtrados = filtros?.competenciaId
    ? (postulantes as unknown[]).filter((row) =>
        (competenciasPorPostulante[(row as { id: string }).id] ?? []).some(
          (c) => c.id === filtros.competenciaId,
        ),
      )
    : (postulantes as unknown[])

  return filtrados.map((row) => {
    const r = row as {
      id: string
      nombre_completo: string
      carrera_otra: string | null
      carrera: { nombre: string } | null
      perfil_en_busqueda: boolean
      localidad: LocalidadEmbed | null
      provincia: ProvinciaEmbed | null
      test_eneagrama: {
        tiene_empate_dominante: boolean
        test_eneagrama_dominante: { eneatipo: { numero_eneatipo: number; nombre: string } }[]
      } | null
    }
    const primerDominante = r.test_eneagrama?.test_eneagrama_dominante[0]?.eneatipo ?? null
    return {
      id: r.id,
      nombre_completo: r.nombre_completo,
      carrera: r.carrera?.nombre ?? r.carrera_otra ?? null,
      perfil_en_busqueda: r.perfil_en_busqueda,
      eneatipo_numero: primerDominante?.numero_eneatipo ?? null,
      eneatipo_nombre: primerDominante?.nombre ?? null,
      competencias: (competenciasPorPostulante[r.id] ?? []).map((c) => ({ nombre: c.nombre })),
      nombre_provincia: r.provincia?.nombre ?? null,
      nombre_localidad: r.localidad?.nombre ?? null,
    }
  })
})

/** Detalle de un postulante — con lógica de contacto */
export async function getPostulanteDetalle(postulanteId: string): Promise<PostulanteDetalle | null> {
  const session = await verifySession()
  const supabase = await createClient()
  const admin = createAdminClient()

  // Load the recruiter's profile first to check if the applicant posted to one of their jobs
  const { data: reclutador } = await supabase
    .from('perfil_reclutador')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  const reclutadorId = reclutador ? (reclutador as { id: string }).id : null

  // Check if this applicant posted to one of the recruiter's jobs
  let postuloAlReclutador = false
  if (reclutadorId) {
    const { data: puestosRec } = await supabase
      .from('puesto')
      .select('id')
      .eq('reclutador_id', reclutadorId)
    const puestoIds = (puestosRec ?? []).map((r: unknown) => (r as { id: string }).id)

    if (puestoIds.length > 0) {
      const { data: postulacion } = await admin
        .from('postulacion')
        .select('id')
        .eq('postulante_id', postulanteId)
        .in('puesto_id', puestoIds)
        .limit(1)
        .maybeSingle()
      if (postulacion) postuloAlReclutador = true
    }
  }

  // Visible if: actively searching OR posted to one of the recruiter's jobs
  // Use admin to bypass RLS when reading another user's profile
  const { data: postulante } = await admin
    .from('perfil_postulante')
    .select(`
      id, nombre_completo, carrera_otra, carrera:carrera_id(nombre), perfil_en_busqueda,
      telefono, enlace_linkedin, portfolio, ultima_conexion,
      usuario(email), provincia(nombre), localidad(nombre, departamento(nombre)),
      test_eneagrama(tiene_empate_dominante, test_eneagrama_dominante(eneatipo(numero_eneatipo, nombre)))
    `)
    .eq('id', postulanteId)
    .single()

  if (!postulante) return null

  const p = postulante as {
    id: string
    nombre_completo: string
    carrera_otra: string | null
    carrera: { nombre: string } | null
    perfil_en_busqueda: boolean
    telefono: string | null
    enlace_linkedin: string | null
    portfolio: string | null
    ultima_conexion: string | null
    usuario: { email: string } | null
    localidad: (LocalidadEmbed & { departamento: { nombre: string } | null }) | null
    provincia: ProvinciaEmbed | null
    test_eneagrama: {
      tiene_empate_dominante: boolean
      test_eneagrama_dominante: { eneatipo: { numero_eneatipo: number; nombre: string } }[]
    } | null
  }

  // Gate: must be searchable OR have applied to this recruiter's jobs
  if (!p.perfil_en_busqueda && !postuloAlReclutador) return null

  // Contact is released if searching actively or if they applied to this recruiter's jobs
  const contactoLiberado = p.perfil_en_busqueda || postuloAlReclutador

  // Perfil técnico — admin to bypass RLS
  const { data: pt } = await admin
    .from('perfil_tecnico')
    .select('id')
    .eq('postulante_id', postulanteId)
    .maybeSingle()

  let formaciones: PostulanteDetalle['formaciones'] = []
  let cursos: PostulanteDetalle['cursos'] = []
  let experiencias: PostulanteDetalle['experiencias'] = []
  let idiomas: PostulanteDetalle['idiomas'] = []

  if (pt) {
    const ptId = (pt as { id: string }).id
    const [f, cu, e, i] = await Promise.all([
      admin
        .from('formacion_academica')
        .select('titulo, institucion, fecha_graduacion')
        .eq('perfil_tecnico_id', ptId)
        .order('fecha_graduacion', { ascending: false, nullsFirst: false }),
      admin
        .from('curso')
        .select('nombre, institucion, fecha_fin, duracion_horas, url_credencial')
        .eq('perfil_tecnico_id', ptId)
        .order('fecha_fin', { ascending: false }),
      // `descripcion` son las tareas del puesto: es lo que deja ver qué hizo
      // realmente el candidato, y el perfil propio del postulante ya la muestra.
      admin
        .from('experiencia_laboral')
        .select('puesto, empresa, fecha_inicio, fecha_fin, descripcion')
        .eq('perfil_tecnico_id', ptId)
        .order('fecha_inicio', { ascending: false }),
      admin
        .from('idioma')
        .select('nombre, nivel_idioma')
        .eq('perfil_tecnico_id', ptId),
    ])
    formaciones = (f.data ?? []) as typeof formaciones
    cursos = (cu.data ?? []) as typeof cursos
    experiencias = (e.data ?? []) as typeof experiencias
    idiomas = (i.data ?? []) as typeof idiomas
  }

  // Informe: visible if searchable OR applied to this recruiter's jobs — admin to bypass RLS
  let informeContenido: InformePersonalidadJSON | null = null
  let anexo: AnexoReclutador | null = null
  if (p.perfil_en_busqueda || postuloAlReclutador) {
    const { data: informe } = await admin
      .from('informe_personalidad')
      .select('id, contenido_json, estado_informe')
      .eq('postulante_id', postulanteId)
      .eq('estado_informe', 'LISTO')
      .maybeSingle()
    const informeTyped = informe as { id: string; contenido_json: InformePersonalidadJSON | null } | null
    informeContenido = informeTyped?.contenido_json ?? null

    if (informeTyped) {
      const { data: filaAnexo } = await admin
        .from('informe_anexo')
        .select('contenido')
        .eq('informe_id', informeTyped.id)
        .maybeSingle()
      anexo = (filaAnexo?.contenido as AnexoReclutador | undefined) ?? null
    }
  }

  // Competencias del postulante — admin to bypass RLS
  let competencias: { nombre: string }[] = []
  if (pt) {
    const ptId = (pt as { id: string }).id
    const { data: comps } = await admin
      .from('postulante_competencia')
      .select('competencia(nombre)')
      .eq('perfil_tecnico_id', ptId)
    competencias = (comps ?? [])
      .map((c: unknown) => (c as { competencia: { nombre: string } | null }).competencia)
      .filter((c): c is { nombre: string } => c !== null)
  }

  return {
    id: p.id,
    nombre_completo: p.nombre_completo,
    carrera: p.carrera?.nombre ?? p.carrera_otra ?? null,
    perfil_en_busqueda: p.perfil_en_busqueda,
    eneatipo_numero: p.test_eneagrama?.test_eneagrama_dominante[0]?.eneatipo?.numero_eneatipo ?? null,
    eneatipo_nombre: p.test_eneagrama?.test_eneagrama_dominante[0]?.eneatipo?.nombre ?? null,
    competencias,
    nombre_provincia: p.provincia?.nombre ?? null,
    nombre_localidad: p.localidad?.nombre ?? null,
    nombre_departamento: p.localidad?.departamento?.nombre ?? null,
    email: contactoLiberado ? (p.usuario?.email ?? null) : null,
    telefono: contactoLiberado ? p.telefono : null,
    enlace_linkedin: contactoLiberado ? p.enlace_linkedin : null,
    portfolio: contactoLiberado ? p.portfolio : null,
    ultima_conexion: p.ultima_conexion ?? null,
    formaciones,
    cursos,
    experiencias,
    idiomas,
    informe: informeContenido,
    anexo,
  }
}

export type NotaReclutador = {
  id: string
  contenido: string
  fecha_creacion: string
  updated_at: string
  puesto_id: string | null
  titulo_puesto: string | null
  postulante_id: string
  nombre_completo: string | null  // null if candidate was deleted
}

/** All private notes for the authenticated recruiter, across all candidates */
export const getTodasLasNotasReclutador = cache(async (filters?: {
  candidatoId?: string
}): Promise<NotaReclutador[]> => {
  const session = await verifySession()
  const supabase = await createClient()

  const { data: reclutador } = await supabase
    .from('perfil_reclutador')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!reclutador) return []

  const reclutadorId = (reclutador as { id: string }).id

  let query = supabase
    .from('nota_privada')
    .select(`
      id, contenido, fecha_creacion, updated_at, puesto_id,
      puesto(titulo_puesto),
      perfil_postulante!postulante_id(id, nombre_completo)
    `)
    .eq('reclutador_id', reclutadorId)

  if (filters?.candidatoId) {
    query = query.eq('postulante_id', filters.candidatoId)
  }

  const { data } = await query
    .order('fecha_creacion', { ascending: false })
    .limit(100)

  return (data ?? []).map((row: unknown) => {
    const r = row as {
      id: string
      contenido: string
      fecha_creacion: string
      updated_at: string
      puesto_id: string | null
      puesto: { titulo_puesto: string } | null
      perfil_postulante: { id: string; nombre_completo: string | null } | null
    }
    return {
      id: r.id,
      contenido: r.contenido,
      fecha_creacion: r.fecha_creacion,
      updated_at: r.updated_at,
      puesto_id: r.puesto_id,
      titulo_puesto: r.puesto?.titulo_puesto ?? null,
      postulante_id: r.perfil_postulante?.id ?? '',
      nombre_completo: r.perfil_postulante?.nombre_completo ?? null,
    }
  })
})

/** Prefijo con el que postulacion-acciones.tsx guarda el motivo de un descarte manual. */
const PREFIJO_NO_AVANZAR = 'Motivo de no avanzar'

/**
 * Motivos de descarte manual (la nota privada opcional que deja el reclutador al
 * usar "No avanzar"), indexados por `postulanteId:puestoId`. La clave con puesto
 * vacío cubre las notas cargadas sin puesto asociado.
 */
export const getMotivosNoAvanzar = cache(async (postulanteIds: string[]) => {
  const mapa = new Map<string, string>()
  if (postulanteIds.length === 0) return mapa

  const session = await verifySession()
  const supabase = await createClient()

  const { data: reclutador } = await supabase
    .from('perfil_reclutador')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!reclutador) return mapa

  const { data } = await supabase
    .from('nota_privada')
    .select('contenido, postulante_id, puesto_id, fecha_creacion')
    .eq('reclutador_id', (reclutador as { id: string }).id)
    .in('postulante_id', postulanteIds)
    .like('contenido', `${PREFIJO_NO_AVANZAR}%`)
    .order('fecha_creacion', { ascending: false })

  for (const row of (data ?? []) as {
    contenido: string; postulante_id: string; puesto_id: string | null
  }[]) {
    const clave = `${row.postulante_id}:${row.puesto_id ?? ''}`
    // Viene ordenado por fecha desc: la primera de cada clave es la última cargada.
    if (mapa.has(clave)) continue
    // Guardamos sólo el texto que escribió el reclutador, sin el prefijo.
    mapa.set(clave, row.contenido.replace(/^Motivo de no avanzar(?: en "[^"]*")?:\s*/, ''))
  }

  return mapa
})

/** Notas privadas del reclutador para un postulante */
export const getNotasPrivadas = cache(async (postulanteId: string) => {
  const session = await verifySession()
  const supabase = await createClient()

  const { data: reclutador } = await supabase
    .from('perfil_reclutador')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!reclutador) return []

  const { data } = await supabase
    .from('nota_privada')
    .select('id, contenido, fecha_creacion, updated_at, puesto_id, puesto(titulo_puesto)')
    .eq('reclutador_id', (reclutador as { id: string }).id)
    .eq('postulante_id', postulanteId)
    .order('updated_at', { ascending: false })

  return (data ?? []).map((row: unknown) => {
    const r = row as {
      id: string
      contenido: string
      fecha_creacion: string
      updated_at: string
      puesto_id: string | null
      puesto: { titulo_puesto: string } | null
    }
    return {
      id: r.id,
      contenido: r.contenido,
      fecha_creacion: r.fecha_creacion,
      updated_at: r.updated_at,
      puesto_id: r.puesto_id,
      titulo_puesto: r.puesto?.titulo_puesto ?? null,
    }
  })
})
