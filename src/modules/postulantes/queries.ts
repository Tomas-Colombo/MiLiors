import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'

export type PostulanteCard = {
  id: string
  nombre_completo: string
  especificidad_puesto: string | null
  perfil_en_busqueda: boolean
  eneatipo_numero: number | null
  eneatipo_nombre: string | null
  competencias: { nombre: string }[]
}

export type PostulanteDetalle = PostulanteCard & {
  // Contacto: solo se incluye si hay autorización
  email: string | null
  telefono: string | null
  enlace_linkedin: string | null
  portfolio: string | null
  // Perfil técnico
  formaciones: { titulo: string; institucion: string; fecha_graduacion: string | null }[]
  experiencias: { puesto: string; empresa: string; fecha_inicio: string; fecha_fin: string | null }[]
  idiomas: { nombre: string; nivel_idioma: string }[]
  humanDesign: {
    tipo_energetico: string
    autoridad_hd: string
    perfil_hd: string
    estrategia_hd: string
  } | null
  // Informe (solo si perfil_en_busqueda y estado LISTO)
  informe: string | null
}

/** Buscar postulantes con perfil_en_busqueda=true */
export const buscarPostulantes = cache(async (filtros?: {
  competenciaId?: string
  busqueda?: string
}): Promise<PostulanteCard[]> => {
  const supabase = await createClient()

  // Query base: perfil_postulante en búsqueda con eneatipo
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('perfil_postulante')
    .select(`
      id, nombre_completo, especificidad_puesto, perfil_en_busqueda,
      test_eneagrama(eneatipo(numero_eneatipo, nombre))
    `)
    .eq('perfil_en_busqueda', true)

  if (filtros?.busqueda) {
    query = query.ilike('nombre_completo', `%${filtros.busqueda}%`)
  }

  const { data: postulantes } = await query

  if (!postulantes || postulantes.length === 0) return []

  // Cargar competencias en paralelo para cada postulante
  const postulanteIds = (postulantes as unknown[]).map((p) => (p as { id: string }).id)

  const { data: perfilesTecnicos } = await supabase
    .from('perfil_tecnico')
    .select('postulante_id, postulante_competencia(competencia(nombre))')
    .in('postulante_id', postulanteIds)

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

  return (postulantes as unknown[]).map((row) => {
    const r = row as {
      id: string
      nombre_completo: string
      especificidad_puesto: string | null
      perfil_en_busqueda: boolean
      test_eneagrama: { eneatipo: { numero_eneatipo: number; nombre: string } | null } | null
    }
    return {
      id: r.id,
      nombre_completo: r.nombre_completo,
      especificidad_puesto: r.especificidad_puesto,
      perfil_en_busqueda: r.perfil_en_busqueda,
      eneatipo_numero: r.test_eneagrama?.eneatipo?.numero_eneatipo ?? null,
      eneatipo_nombre: r.test_eneagrama?.eneatipo?.nombre ?? null,
      competencias: competenciasPorPostulante[r.id] ?? [],
    }
  })
})

/** Detalle de un postulante — con lógica de contacto */
export async function getPostulanteDetalle(postulanteId: string): Promise<PostulanteDetalle | null> {
  const session = await verifySession()
  const supabase = await createClient()

  // Solo postulantes en búsqueda son visibles para reclutadores
  const { data: postulante } = await supabase
    .from('perfil_postulante')
    .select(`
      id, nombre_completo, especificidad_puesto, perfil_en_busqueda,
      telefono, enlace_linkedin, portfolio,
      usuario(email),
      test_eneagrama(eneatipo(numero_eneatipo, nombre))
    `)
    .eq('id', postulanteId)
    .eq('perfil_en_busqueda', true)
    .single()

  if (!postulante) return null

  const p = postulante as {
    id: string
    nombre_completo: string
    especificidad_puesto: string | null
    perfil_en_busqueda: boolean
    telefono: string | null
    enlace_linkedin: string | null
    portfolio: string | null
    usuario: { email: string } | null
    test_eneagrama: { eneatipo: { numero_eneatipo: number; nombre: string } | null } | null
  }

  // perfil_en_busqueda=true ya habilita el contacto
  // Adicionalmente: si postuló a un puesto propio también se libera
  let contactoLiberado = p.perfil_en_busqueda

  if (!contactoLiberado) {
    const { data: reclutador } = await supabase
      .from('perfil_reclutador')
      .select('id')
      .eq('usuario_id', session.id)
      .single()

    if (reclutador) {
      const reclutadorId = (reclutador as { id: string }).id
      const { data: puestosRec } = await supabase
        .from('puesto')
        .select('id')
        .eq('reclutador_id', reclutadorId)
      const puestoIds = (puestosRec ?? []).map((r: unknown) => (r as { id: string }).id)

      if (puestoIds.length > 0) {
        const { data: postulacion } = await supabase
          .from('postulacion')
          .select('id')
          .eq('postulante_id', postulanteId)
          .in('puesto_id', puestoIds)
          .limit(1)
          .maybeSingle()
        if (postulacion) contactoLiberado = true
      }
    }
  }

  // Perfil técnico
  const { data: pt } = await supabase
    .from('perfil_tecnico')
    .select('id')
    .eq('postulante_id', postulanteId)
    .maybeSingle()

  let formaciones: { titulo: string; institucion: string; fecha_graduacion: string | null }[] = []
  let experiencias: { puesto: string; empresa: string; fecha_inicio: string; fecha_fin: string | null }[] = []
  let idiomas: { nombre: string; nivel_idioma: string }[] = []

  if (pt) {
    const ptId = (pt as { id: string }).id
    const [f, e, i] = await Promise.all([
      supabase
        .from('formacion_academica')
        .select('titulo, institucion, fecha_graduacion')
        .eq('perfil_tecnico_id', ptId),
      supabase
        .from('experiencia_laboral')
        .select('puesto, empresa, fecha_inicio, fecha_fin')
        .eq('perfil_tecnico_id', ptId),
      supabase
        .from('idioma')
        .select('nombre, nivel_idioma')
        .eq('perfil_tecnico_id', ptId),
    ])
    formaciones = (f.data ?? []) as typeof formaciones
    experiencias = (e.data ?? []) as typeof experiencias
    idiomas = (i.data ?? []) as typeof idiomas
  }

  // Human Design
  const { data: hd } = await supabase
    .from('human_design')
    .select('tipo_energetico, autoridad_hd, perfil_hd, estrategia_hd')
    .eq('postulante_id', postulanteId)
    .maybeSingle()

  // Informe (solo si perfil_en_busqueda y LISTO)
  let informeContenido: string | null = null
  if (p.perfil_en_busqueda) {
    const { data: informe } = await supabase
      .from('informe_personalidad')
      .select('contenido_informe, estado_informe')
      .eq('postulante_id', postulanteId)
      .eq('estado_informe', 'LISTO')
      .maybeSingle()
    informeContenido = informe
      ? (informe as { contenido_informe: string | null }).contenido_informe
      : null
  }

  // Competencias del postulante
  let competencias: { nombre: string }[] = []
  if (pt) {
    const ptId = (pt as { id: string }).id
    const { data: comps } = await supabase
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
    especificidad_puesto: p.especificidad_puesto,
    perfil_en_busqueda: p.perfil_en_busqueda,
    eneatipo_numero: p.test_eneagrama?.eneatipo?.numero_eneatipo ?? null,
    eneatipo_nombre: p.test_eneagrama?.eneatipo?.nombre ?? null,
    competencias,
    email: contactoLiberado ? (p.usuario?.email ?? null) : null,
    telefono: contactoLiberado ? p.telefono : null,
    enlace_linkedin: contactoLiberado ? p.enlace_linkedin : null,
    portfolio: contactoLiberado ? p.portfolio : null,
    formaciones,
    experiencias,
    idiomas,
    humanDesign: hd
      ? (hd as {
          tipo_energetico: string
          autoridad_hd: string
          perfil_hd: string
          estrategia_hd: string
        })
      : null,
    informe: informeContenido,
  }
}

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
