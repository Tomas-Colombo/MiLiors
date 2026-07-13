import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'

/**
 * Carga las 135 preguntas ordenadas por numero_pregunta.
 */
export const getPreguntasEneagrama = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pregunta_eneagrama')
    .select('id, numero_pregunta, enunciado, eneatipo_asociado')
    .eq('pausada', false)
    .is('fecha_baja', null)
    .order('numero_pregunta', { ascending: true })

  if (error) throw new Error('Error cargando preguntas del Eneagrama')
  return data ?? []
})

/**
 * Carga las opciones de respuesta ordenadas por valor.
 */
export const getOpcionesRespuesta = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('opcion_respuesta')
    .select('id, valor_numerico, texto_opcion')
    .order('valor_numerico', { ascending: true })

  if (error) throw new Error('Error cargando opciones de respuesta')
  return data ?? []
})

/**
 * Carga el test vigente del postulante (si existe) y sus respuestas guardadas.
 */
export const getTestActual = cache(async () => {
  const session = await verifySession()
  const supabase = await createClient()

  // Obtener perfil del postulante
  const { data: perfil } = await supabase
    .from('perfil_postulante')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!perfil) return null

  // Obtener test vigente. La completitud se determina por la presencia de
  // dominantes calculados (test_eneagrama_dominante), no por la columna
  // eneatipo_id, que quedó deprecada al pasar a soportar múltiples dominantes.
  const { data: test } = await supabase
    .from('test_eneagrama')
    .select('id, fecha_realizacion, updated_at, test_eneagrama_dominante(id)')
    .eq('postulante_id', (perfil as { id: string }).id)
    .single()

  if (!test) return { perfilId: (perfil as { id: string }).id, test: null, respuestas: [] }

  // Obtener respuestas guardadas
  const { data: respuestas } = await supabase
    .from('respuesta_item_eneagrama')
    .select('pregunta_id, valor_respondido')
    .eq('test_eneagrama_id', (test as { id: string }).id)

  const testTyped = test as {
    id: string
    fecha_realizacion: string
    updated_at: string
    test_eneagrama_dominante: { id: string }[]
  }

  return {
    perfilId: (perfil as { id: string }).id,
    test: {
      id: testTyped.id,
      fecha_realizacion: testTyped.fecha_realizacion,
      updated_at: testTyped.updated_at,
      completo: testTyped.test_eneagrama_dominante.length > 0,
    },
    respuestas: (respuestas ?? []) as { pregunta_id: string; valor_respondido: number }[],
  }
})

/**
 * Carga el perfil básico del postulante para el onboarding.
 */
export const getPerfilPostulante = cache(async () => {
  const session = await verifySession()
  const supabase = await createClient()

  const { data } = await supabase
    .from('perfil_postulante')
    .select('id, nombre_completo, telefono, carrera_id, carrera_otra, enlace_linkedin, portfolio, provincia_id, localidad_id')
    .eq('usuario_id', session.id)
    .single()

  return data as {
    id: string
    nombre_completo: string
    telefono: string | null
    carrera_id: string | null
    carrera_otra: string | null
    enlace_linkedin: string | null
    portfolio: string | null
    provincia_id: string | null
    localidad_id: string | null
  } | null
})
