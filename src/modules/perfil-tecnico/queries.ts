import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import type { NivelCompetencia } from '@/lib/constants/enums'

// Base type for the full technical profile with all relations
export type PerfilTecnicoCompleto = {
  id: string
  postulante_id: string
  resumen_profesional_llm: string | null
  fecha_actualizacion: string
  formaciones: FormacionItem[]
  cursos: CursoItem[]
  experiencias: ExperienciaItem[]
  idiomas: IdiomaItem[]
  competencias: CompetenciaItem[]
}

export type FormacionItem = {
  id: string
  institucion: string
  titulo: string
  fecha_graduacion: string | null
}

export type CursoItem = {
  id: string
  nombre: string
  institucion: string
  fecha_fin: string | null
  duracion_horas: number | null
  url_credencial: string | null
}

export type ExperienciaItem = {
  id: string
  empresa: string
  puesto: string
  fecha_inicio: string
  fecha_fin: string | null
  descripcion: string | null
}

export type IdiomaItem = {
  id: string
  nombre: string
  nivel_idioma: string
}

export type CompetenciaItem = {
  id: string
  nombre: string
  /** Nivel de dominio del postulante. Ausente en los items del catálogo. */
  nivel?: NivelCompetencia
}

/** Loads the full technical profile for the current applicant */
export const getPerfilTecnicoCompleto = cache(async (): Promise<PerfilTecnicoCompleto | null> => {
  const session = await verifySession()
  const supabase = await createClient()

  const { data: postulante } = await supabase
    .from('perfil_postulante')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!postulante) return null
  const postulanteId = (postulante as { id: string }).id

  const { data: pt } = await supabase
    .from('perfil_tecnico')
    .select('id, postulante_id, resumen_profesional_llm, fecha_actualizacion')
    .eq('postulante_id', postulanteId)
    .single()

  if (!pt) {
    return {
      id: '',
      postulante_id: postulanteId,
      resumen_profesional_llm: null,
      fecha_actualizacion: '',
      formaciones: [],
      cursos: [],
      experiencias: [],
      idiomas: [],
      competencias: [],
    }
  }

  const ptTyped = pt as { id: string; postulante_id: string; resumen_profesional_llm: string | null; fecha_actualizacion: string }

  const [formaciones, cursos, experiencias, idiomas, competenciasJoin] = await Promise.all([
    supabase
      .from('formacion_academica')
      .select('id, institucion, titulo, fecha_graduacion')
      .eq('perfil_tecnico_id', ptTyped.id)
      .order('fecha_graduacion', { ascending: false }),
    supabase
      .from('curso')
      .select('id, nombre, institucion, fecha_fin, duracion_horas, url_credencial')
      .eq('perfil_tecnico_id', ptTyped.id)
      .order('fecha_fin', { ascending: false }),
    supabase
      .from('experiencia_laboral')
      .select('id, empresa, puesto, fecha_inicio, fecha_fin, descripcion')
      .eq('perfil_tecnico_id', ptTyped.id)
      .order('fecha_inicio', { ascending: false }),
    supabase
      .from('idioma')
      .select('id, nombre, nivel_idioma')
      .eq('perfil_tecnico_id', ptTyped.id),
    supabase
      .from('postulante_competencia')
      .select('competencia_id, nivel, competencia(id, nombre)')
      .eq('perfil_tecnico_id', ptTyped.id),
  ])

  return {
    id: ptTyped.id,
    postulante_id: postulanteId,
    resumen_profesional_llm: ptTyped.resumen_profesional_llm,
    fecha_actualizacion: ptTyped.fecha_actualizacion,
    formaciones: ((formaciones.data ?? []) as FormacionItem[]),
    cursos: ((cursos.data ?? []) as CursoItem[]),
    experiencias: ((experiencias.data ?? []) as ExperienciaItem[]),
    idiomas: ((idiomas.data ?? []) as IdiomaItem[]),
    competencias: (competenciasJoin.data ?? []).map((row: unknown) => {
      const r = row as { nivel: NivelCompetencia | null; competencia: { id: string; nombre: string } | null }
      if (!r.competencia) return null
      const item: CompetenciaItem = { id: r.competencia.id, nombre: r.competencia.nombre, nivel: r.nivel ?? 'BASICO' }
      return item
    }).filter((c): c is CompetenciaItem => c !== null),
  }
})

/** Loads the active competencies catalog (without logical deletion) */
export const getCompetenciasCatalogo = cache(async (): Promise<CompetenciaItem[]> => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('competencia')
    .select('id, nombre')
    .is('fecha_baja', null)
    .order('nombre', { ascending: true })
  return (data ?? []) as CompetenciaItem[]
})
