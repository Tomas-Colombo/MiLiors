import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { TipoPreguntaPreselector } from '@/lib/types/domain'

export type OpcionPreselector = {
  id: string
  texto: string
  esValida: boolean
  orden: number
}

export type PreguntaPreselector = {
  id: string
  texto: string
  tipo: TipoPreguntaPreselector
  esCritica: boolean
  orden: number
  opciones: OpcionPreselector[]
}

export type FormularioPreselector = {
  id: string
  puestoId: string
  preguntas: PreguntaPreselector[]
}

/** Formulario preselector de un puesto (con preguntas y opciones ordenadas), o null si no tiene. */
export const getFormularioDePuesto = cache(async (puestoId: string): Promise<FormularioPreselector | null> => {
  const supabase = await createClient()

  const { data: formulario } = await supabase
    .from('formulario_preselector')
    .select('id, puesto_id')
    .eq('puesto_id', puestoId)
    .maybeSingle()

  if (!formulario) return null
  const f = formulario as { id: string; puesto_id: string }

  const { data: preguntas } = await supabase
    .from('pregunta_preselector')
    .select('id, texto, tipo, es_critica, orden, opcion_pregunta_preselector(id, texto, es_valida, orden)')
    .eq('formulario_id', f.id)
    .order('orden', { ascending: true })

  const preguntasOrdenadas: PreguntaPreselector[] = ((preguntas ?? []) as unknown[]).map((row) => {
    const r = row as {
      id: string
      texto: string
      tipo: TipoPreguntaPreselector
      es_critica: boolean
      orden: number
      opcion_pregunta_preselector: { id: string; texto: string; es_valida: boolean; orden: number }[]
    }
    return {
      id: r.id,
      texto: r.texto,
      tipo: r.tipo,
      esCritica: r.es_critica,
      orden: r.orden,
      opciones: (r.opcion_pregunta_preselector ?? [])
        .slice()
        .sort((a, b) => a.orden - b.orden)
        .map((o) => ({ id: o.id, texto: o.texto, esValida: o.es_valida, orden: o.orden })),
    }
  })

  return {
    id: f.id,
    puestoId: f.puesto_id,
    preguntas: preguntasOrdenadas,
  }
})

/** Ids de los puestos del listado dado que tienen formulario preselector. */
export const getPuestosConFormulario = cache(async (puestoIds: string[]): Promise<Set<string>> => {
  if (puestoIds.length === 0) return new Set()
  const supabase = await createClient()

  const { data } = await supabase
    .from('formulario_preselector')
    .select('puesto_id')
    .in('puesto_id', puestoIds)

  return new Set(((data ?? []) as { puesto_id: string }[]).map((r) => r.puesto_id))
})

/** true si el formulario preselector del puesto ya tiene al menos una respuesta de postulantes. */
export const formularioTieneRespuestas = cache(async (puestoId: string): Promise<boolean> => {
  const supabase = await createClient()

  const { data } = await supabase
    .from('respuesta_preselector')
    .select('id, pregunta_preselector!inner(formulario_preselector!inner(puesto_id))')
    .eq('pregunta_preselector.formulario_preselector.puesto_id', puestoId)
    .limit(1)

  return (data ?? []).length > 0
})

/** Ids de las postulaciones del listado dado que tienen respuestas de preselector (RLS limita a las visibles). */
export const getPostulacionesConRespuestas = cache(async (postulacionIds: string[]): Promise<Set<string>> => {
  if (postulacionIds.length === 0) return new Set()
  const supabase = await createClient()

  const { data } = await supabase
    .from('respuesta_preselector')
    .select('postulacion_id')
    .in('postulacion_id', postulacionIds)

  return new Set(((data ?? []) as { postulacion_id: string }[]).map((r) => r.postulacion_id))
})

export type RespuestaPreselectorConTexto = {
  preguntaId: string
  preguntaTexto: string
  opcionId: string | null
  opcionTexto: string | null
  textoLibre: string | null
}

/** Respuestas de una postulación al formulario preselector, con el texto de pregunta/opción resuelto. */
export const getRespuestasDePostulacion = cache(async (
  postulacionId: string
): Promise<RespuestaPreselectorConTexto[]> => {
  const supabase = await createClient()

  const { data } = await supabase
    .from('respuesta_preselector')
    .select('pregunta_id, opcion_id, texto_libre, pregunta_preselector(texto), opcion_pregunta_preselector(texto)')
    .eq('postulacion_id', postulacionId)

  return ((data ?? []) as unknown[]).map((row) => {
    const r = row as {
      pregunta_id: string
      opcion_id: string | null
      texto_libre: string | null
      pregunta_preselector: { texto: string } | null
      opcion_pregunta_preselector: { texto: string } | null
    }
    return {
      preguntaId: r.pregunta_id,
      preguntaTexto: r.pregunta_preselector?.texto ?? '',
      opcionId: r.opcion_id,
      opcionTexto: r.opcion_pregunta_preselector?.texto ?? null,
      textoLibre: r.texto_libre,
    }
  })
})
