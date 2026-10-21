import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getPerfilPostulanteActual } from '@/modules/perfil/queries'

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

/** Test de Eneagrama con la unión de columnas que leen sus consumidores. */
export type TestEneagramaPostulante = {
  id: string
  fecha_realizacion: string
  updated_at: string
  veces_completado: number
  tiene_empate_dominante: boolean
  dominantes_empate: number[] | null
  test_eneagrama_dominante: {
    id: string
    puntaje_crudo: number
    porcentaje: number
    eneatipo: { numero_eneatipo: number; nombre: string; descripcion: string | null } | null
  }[]
}

/**
 * Test de Eneagrama de un postulante con sus dominantes calculados, o null si
 * todavía no lo empezó. Hay un único test por postulante.
 *
 * Selecciona la unión de lo que necesitan el layout, el guard de Eneagrama
 * completo, el inicio, el perfil de personalidad, el wizard y el certificado:
 * memoizada por React cache(), todos comparten una sola lectura por request.
 */
export const getTestEneagramaDePostulante = cache(
  async (postulanteId: string): Promise<TestEneagramaPostulante | null> => {
    const supabase = await createClient()

    // maybeSingle: sin test devuelve null igual que .single(), pero sin el 406.
    const { data } = await supabase
      .from('test_eneagrama')
      .select(
        'id, fecha_realizacion, updated_at, veces_completado, tiene_empate_dominante, dominantes_empate, test_eneagrama_dominante(id, puntaje_crudo, porcentaje, eneatipo(numero_eneatipo, nombre, descripcion))'
      )
      .eq('postulante_id', postulanteId)
      .maybeSingle()

    return (data as unknown as TestEneagramaPostulante | null) ?? null
  }
)

/**
 * Carga el test vigente del postulante (si existe) y sus respuestas guardadas.
 */
export const getTestActual = cache(async () => {
  const perfil = await getPerfilPostulanteActual()
  if (!perfil) return null

  // La completitud se determina por la presencia de dominantes calculados
  // (test_eneagrama_dominante), no por la columna eneatipo_id, que quedó
  // deprecada al pasar a soportar múltiples dominantes.
  const test = await getTestEneagramaDePostulante(perfil.id)

  if (!test) return { perfilId: perfil.id, test: null, respuestas: [] }

  const supabase = await createClient()

  // Obtener respuestas guardadas
  const { data: respuestas } = await supabase
    .from('respuesta_item_eneagrama')
    .select('pregunta_id, valor_respondido')
    .eq('test_eneagrama_id', test.id)

  return {
    perfilId: perfil.id,
    test: {
      id: test.id,
      fecha_realizacion: test.fecha_realizacion,
      updated_at: test.updated_at,
      veces_completado: test.veces_completado ?? 0,
      completo: test.test_eneagrama_dominante.length > 0,
    },
    respuestas: (respuestas ?? []) as { pregunta_id: string; valor_respondido: number }[],
  }
})

/**
 * Carga el perfil básico del postulante para el onboarding. Proyecta solo las
 * columnas del formulario sobre la lectura compartida del perfil.
 */
export const getPerfilPostulante = cache(async () => {
  const perfil = await getPerfilPostulanteActual()
  if (!perfil) return null

  return {
    id: perfil.id,
    nombre_completo: perfil.nombre_completo,
    nombre_preferido: perfil.nombre_preferido,
    fecha_nacimiento: perfil.fecha_nacimiento,
    telefono: perfil.telefono,
    carrera_id: perfil.carrera_id,
    carrera_otra: perfil.carrera_otra,
    enlace_linkedin: perfil.enlace_linkedin,
    portfolio: perfil.portfolio,
    localidad_id: perfil.localidad_id,
    provincia_id: perfil.provincia_id,
  }
})
