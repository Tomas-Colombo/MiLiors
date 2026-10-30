import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { patronSinTildes } from '@/lib/texto'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { getReclutadorId } from '@/modules/empresas/queries'
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

/** Tamaño de página del buscador de postulantes. */
export const POSTULANTES_POR_PAGINA = 12

/** Página del buscador: misma forma que devuelve `paginar`, con `total` para el encabezado. */
export type PaginaPostulantes = {
  items: PostulanteCard[]
  total: number
  page: number
  pageCount: number
}

/** Buscar postulantes con perfil_en_busqueda=true, paginado en SQL */
export const buscarPostulantes = cache(async (filtros?: {
  competenciaId?: string
  busqueda?: string
  provinciaId?: string
  departamentoId?: string
  carrera?: string
  carreraOtra?: string
  /** Número de página tal cual viene de la URL; se normaliza igual que `paginar`. */
  page?: string
}): Promise<PaginaPostulantes> => {
  const supabase = await createClient()

  // Filtrar por departamento exige que el embed de localidad sea un JOIN
  // interno. Sin ese filtro se deja LEFT: la localidad es opcional, y un perfil
  // que sólo cargó la provincia tiene que seguir apareciendo en la búsqueda.
  const embedUbicacion = filtros?.departamentoId
    ? 'localidad!inner(nombre)'
    : 'localidad(nombre)'

  // Filtrar por competencia también es un JOIN interno, pero sólo para filtrar:
  // los chips de la tarjeta se cargan aparte, para los candidatos de la página,
  // así que acá no se trae nada más que la clave. Los embeds se agregan como JSON
  // en PostgREST, por lo que el JOIN no duplica filas del perfil.
  const embedCompetencia = filtros?.competenciaId
    ? ', perfil_tecnico!inner(postulante_competencia!inner(competencia_id))'
    : ''

  // Mismo criterio que `paginar`: entero >= 1, y lo que no sea un número es la 1.
  const pedida = Math.floor(Number(filtros?.page))
  // NaN no pasa el `>= 1`; Infinity queda topeado y termina en la última página.
  const paginaPedida = pedida >= 1 ? Math.min(pedida, 1_000_000_000) : 1

  // Una función y no una query armada una vez: si la página pedida está fuera de
  // rango hay que repetirla con otra, y un builder de PostgREST no se reutiliza.
  const consultarPagina = (pagina: number) => {
    const desde = (pagina - 1) * POSTULANTES_POR_PAGINA

    let query = supabase
      .from('perfil_postulante')
      .select(`
        id, nombre_completo, carrera_otra, carrera:carrera_id(nombre), perfil_en_busqueda, localidad_id,
        provincia(nombre), ${embedUbicacion}${embedCompetencia}
      `, { count: 'exact' })
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
    if (filtros?.competenciaId) {
      query = query.eq('perfil_tecnico.postulante_competencia.competencia_id', filtros.competenciaId)
    }

    // Sin un orden total, range() puede repetir u omitir filas entre páginas:
    // el nombre no es único, así que el id desempata.
    return query
      .order('nombre_completo', { ascending: true })
      .order('id', { ascending: true })
      .range(desde, desde + POSTULANTES_POR_PAGINA - 1)
  }

  const vacia: PaginaPostulantes = { items: [], total: 0, page: 1, pageCount: 1 }

  let page = paginaPedida
  let respuesta = await consultarPagina(page)

  // Página más allá de la última: `paginar` la llevaba a la última página, así
  // que se hace lo mismo. PostgREST responde 416 (PGRST103) cuando el offset
  // supera el total, o una página vacía; en ambos casos se pide la 1ª para
  // conocer el total y, si hace falta, la última. Sólo ocurre con URLs a mano.
  const fueraDeRango =
    respuesta.error?.code === 'PGRST103' ||
    (!respuesta.error && page > 1 && (respuesta.data?.length ?? 0) === 0)
  if (fueraDeRango) {
    const primera = await consultarPagina(1)
    const ultima = Math.max(1, Math.ceil((primera.count ?? 0) / POSTULANTES_POR_PAGINA))
    page = ultima
    respuesta = ultima === 1 ? primera : await consultarPagina(ultima)
  }

  const { data: postulantes, count, error } = respuesta
  if (error) {
    console.error('[buscarPostulantes] No se pudo leer la página de postulantes:', error)
    return vacia
  }
  if (!postulantes || postulantes.length === 0) return { ...vacia, page }

  const total = count ?? postulantes.length
  const postulanteIds = (postulantes as unknown[]).map((p) => (p as { id: string }).id)

  // Competencias (chips) y eneatipo, sólo para los candidatos de esta página.
  // El eneatipo va con el cliente admin: las políticas RLS de test_eneagrama y
  // test_eneagrama_dominante sólo dejan leer al dueño, así que con el cliente del
  // reclutador el embed siempre volvía vacío. Es seguro porque los ids ya pasaron
  // por la query de arriba, que sí corre bajo RLS y filtra perfil_en_busqueda.
  const admin = createAdminClient()
  const [{ data: perfilesTecnicos, error: errorCompetencias }, { data: tests, error: errorEneatipo }] =
    await Promise.all([
      supabase
        .from('perfil_tecnico')
        .select('postulante_id, postulante_competencia(competencia(nombre))')
        .in('postulante_id', postulanteIds),
      admin
        .from('test_eneagrama')
        .select('postulante_id, test_eneagrama_dominante(eneatipo(numero_eneatipo, nombre))')
        .in('postulante_id', postulanteIds),
    ])
  // Si alguna falla la lista se muestra igual, sólo que sin chips o sin eneatipo.
  if (errorCompetencias) console.error('[buscarPostulantes] No se pudieron leer las competencias:', errorCompetencias)
  if (errorEneatipo) console.error('[buscarPostulantes] No se pudo leer el eneatipo:', errorEneatipo)

  const competenciasPorPostulante: Record<string, { nombre: string }[]> = {}
  for (const pt of (perfilesTecnicos ?? []) as unknown[]) {
    const p = pt as {
      postulante_id: string
      postulante_competencia: { competencia: { nombre: string } | null }[]
    }
    competenciasPorPostulante[p.postulante_id] = p.postulante_competencia
      .map((pc) => pc.competencia)
      .filter((c): c is { nombre: string } => c !== null)
  }

  const eneatipoPorPostulante: Record<string, { numero_eneatipo: number; nombre: string } | null> = {}
  for (const t of (tests ?? []) as unknown[]) {
    const r = t as {
      postulante_id: string
      test_eneagrama_dominante: { eneatipo: { numero_eneatipo: number; nombre: string } }[]
    }
    eneatipoPorPostulante[r.postulante_id] = r.test_eneagrama_dominante[0]?.eneatipo ?? null
  }

  const items = (postulantes as unknown[]).map((row) => {
    const r = row as {
      id: string
      nombre_completo: string
      carrera_otra: string | null
      carrera: { nombre: string } | null
      perfil_en_busqueda: boolean
      localidad: LocalidadEmbed | null
      provincia: ProvinciaEmbed | null
    }
    const primerDominante = eneatipoPorPostulante[r.id] ?? null
    return {
      id: r.id,
      nombre_completo: r.nombre_completo,
      carrera: r.carrera?.nombre ?? r.carrera_otra ?? null,
      perfil_en_busqueda: r.perfil_en_busqueda,
      eneatipo_numero: primerDominante?.numero_eneatipo ?? null,
      eneatipo_nombre: primerDominante?.nombre ?? null,
      competencias: competenciasPorPostulante[r.id] ?? [],
      nombre_provincia: r.provincia?.nombre ?? null,
      nombre_localidad: r.localidad?.nombre ?? null,
    }
  })

  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / POSTULANTES_POR_PAGINA)) }
})

/** Detalle de un postulante — con lógica de contacto */
export async function getPostulanteDetalle(postulanteId: string): Promise<PostulanteDetalle | null> {
  // Sin reclutadorId no hay puestos propios a los que el postulante pudiera aplicar
  const reclutadorId = await getReclutadorId()
  const admin = createAdminClient()

  // Una sola ronda: perfil, perfil técnico con sus hijos, informe con su anexo y
  // si el postulante aplicó a un puesto de este reclutador. El acceso (en búsqueda
  // o postuló) se decide en memoria. Admin en todo: lee el perfil de otro usuario.
  const [{ data: postulante }, { data: pt }, { data: informe }, { data: postulacionPropia }] = await Promise.all([
    admin
      .from('perfil_postulante')
      .select(`
        id, nombre_completo, carrera_otra, carrera:carrera_id(nombre), perfil_en_busqueda,
        telefono, enlace_linkedin, portfolio, ultima_conexion,
        usuario(email), provincia(nombre), localidad(nombre, departamento(nombre)),
        test_eneagrama(tiene_empate_dominante, test_eneagrama_dominante(eneatipo(numero_eneatipo, nombre)))
      `)
      .eq('id', postulanteId)
      .single(),
    // `descripcion` (experiencia_laboral) son las tareas del puesto: es lo que deja ver
    // qué hizo realmente el candidato, y el perfil propio del postulante ya la muestra.
    admin
      .from('perfil_tecnico')
      .select(`
        id,
        formacion_academica(titulo, institucion, fecha_graduacion),
        curso(nombre, institucion, fecha_fin, duracion_horas, url_credencial),
        experiencia_laboral(puesto, empresa, fecha_inicio, fecha_fin, descripcion),
        idioma(nombre, nivel_idioma),
        postulante_competencia(competencia(nombre))
      `)
      .eq('postulante_id', postulanteId)
      .order('fecha_graduacion', { referencedTable: 'formacion_academica', ascending: false, nullsFirst: false })
      .order('fecha_fin', { referencedTable: 'curso', ascending: false })
      .order('fecha_inicio', { referencedTable: 'experiencia_laboral', ascending: false })
      .maybeSingle(),
    // informe_anexo.informe_id es UNIQUE: el embed vuelve como objeto (o null), no array
    admin
      .from('informe_personalidad')
      .select('id, contenido_json, estado_informe, informe_anexo(contenido)')
      .eq('postulante_id', postulanteId)
      .eq('estado_informe', 'LISTO')
      .maybeSingle(),
    // ¿Aplicó a algún puesto de este reclutador? Sin filtro de baja, como antes.
    reclutadorId
      ? admin
          .from('postulacion')
          .select('id, puesto!inner(reclutador_id)')
          .eq('postulante_id', postulanteId)
          .eq('puesto.reclutador_id', reclutadorId)
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  if (!postulante) return null

  const postuloAlReclutador = !!postulacionPropia

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

  const tecnico = pt as {
    formacion_academica: PostulanteDetalle['formaciones']
    curso: PostulanteDetalle['cursos']
    experiencia_laboral: PostulanteDetalle['experiencias']
    idioma: PostulanteDetalle['idiomas']
    postulante_competencia: { competencia: { nombre: string } | null }[]
  } | null
  const formaciones = tecnico?.formacion_academica ?? []
  const cursos = tecnico?.curso ?? []
  const experiencias = tecnico?.experiencia_laboral ?? []
  const idiomas = tecnico?.idioma ?? []
  const competencias = (tecnico?.postulante_competencia ?? [])
    .map((c) => c.competencia)
    .filter((c): c is { nombre: string } => c !== null)

  // Informe: el gate de arriba ya garantiza que es visible (en búsqueda o postuló)
  const informeTyped = informe as {
    contenido_json: InformePersonalidadJSON | null
    informe_anexo: { contenido: AnexoReclutador } | null
  } | null
  const informeContenido: InformePersonalidadJSON | null = informeTyped?.contenido_json ?? null
  const anexo: AnexoReclutador | null = informeTyped?.informe_anexo?.contenido ?? null

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
  const reclutadorId = await getReclutadorId()
  if (!reclutadorId) return []

  const supabase = await createClient()
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

  const reclutadorId = await getReclutadorId()
  if (!reclutadorId) return mapa

  const supabase = await createClient()
  const { data } = await supabase
    .from('nota_privada')
    .select('contenido, postulante_id, puesto_id, fecha_creacion')
    .eq('reclutador_id', reclutadorId)
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
  const reclutadorId = await getReclutadorId()
  if (!reclutadorId) return []

  const supabase = await createClient()
  const { data } = await supabase
    .from('nota_privada')
    .select('id, contenido, fecha_creacion, updated_at, puesto_id, puesto(titulo_puesto)')
    .eq('reclutador_id', reclutadorId)
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
