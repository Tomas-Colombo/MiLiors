import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import type { FormularioPreselectorInput } from './schema'

type SupabaseAny = SupabaseClient<Database>

export type PersistirFormularioResult = { ok: true } | { ok: false; error: string }

export const FORMULARIO_CON_RESPUESTAS_ERROR =
  'El formulario preselector ya tiene respuestas de postulantes y no se puede modificar.'

/**
 * Backend guard mirrored by the read-only editor UI: once a postulante
 * answered, the form is immutable (the respuesta FKs also block the delete
 * at the database level, but this returns a clear message instead of a
 * generic FK error).
 */
async function formularioConRespuestas(supabase: SupabaseAny, puestoId: string): Promise<boolean> {
  const { data } = await supabase
    .from('respuesta_preselector')
    .select('id, pregunta_preselector!inner(formulario_preselector!inner(puesto_id))')
    .eq('pregunta_preselector.formulario_preselector.puesto_id', puestoId)
    .limit(1)

  return (data ?? []).length > 0
}

/**
 * Replace-all semantics: deletes the existing formulario (cascades to
 * preguntas/opciones via ON DELETE CASCADE) and re-inserts everything from
 * `input`, preserving question/option order via `orden`.
 */
export async function persistirFormularioPreselector(
  supabase: SupabaseAny,
  puestoId: string,
  input: FormularioPreselectorInput
): Promise<PersistirFormularioResult> {
  if (await formularioConRespuestas(supabase, puestoId)) {
    return { ok: false, error: FORMULARIO_CON_RESPUESTAS_ERROR }
  }

  const { error: deleteError } = await supabase
    .from('formulario_preselector')
    .delete()
    .eq('puesto_id', puestoId)

  if (deleteError) {
    return { ok: false, error: 'No se pudo actualizar el formulario preselector.' }
  }

  const { data: formulario, error: insertFormError } = await supabase.from('formulario_preselector')
    .insert({ puesto_id: puestoId })
    .select('id')
    .single()

  if (insertFormError || !formulario) {
    return { ok: false, error: 'No se pudo crear el formulario preselector.' }
  }

  const formularioId = (formulario as { id: string }).id

  // Los ids de las preguntas se generan acá (la tabla tiene DEFAULT
  // gen_random_uuid(), pero así las opciones se enlazan sin esperar el
  // `.select('id')` de cada insert): 2 inserts en lugar de hasta 1 + N.
  const preguntas = input.preguntas.map((pregunta, i) => ({
    id: crypto.randomUUID(),
    formulario_id: formularioId,
    texto: pregunta.texto,
    tipo: pregunta.tipo,
    es_critica: pregunta.esCritica,
    orden: i,
  }))

  // El schema exige >= 1 pregunta; si no hubiera, antes tampoco se insertaba nada.
  if (preguntas.length === 0) return { ok: true }

  const { error: preguntasError } = await supabase.from('pregunta_preselector').insert(preguntas)

  if (preguntasError) {
    return { ok: false, error: 'No se pudo guardar una pregunta del formulario.' }
  }

  const opciones = input.preguntas.flatMap((pregunta, i) =>
    (pregunta.opciones ?? []).map((opcion, idx) => ({
      pregunta_id: preguntas[i].id,
      texto: opcion.texto,
      es_valida: opcion.esValida,
      orden: idx,
    }))
  )

  if (opciones.length > 0) {
    const { error: opcionesError } = await supabase.from('opcion_pregunta_preselector').insert(opciones)

    if (opcionesError) {
      return { ok: false, error: 'No se pudieron guardar las opciones de una pregunta.' }
    }
  }

  return { ok: true }
}

export async function eliminarFormularioPreselector(
  supabase: SupabaseAny,
  puestoId: string
): Promise<PersistirFormularioResult> {
  if (await formularioConRespuestas(supabase, puestoId)) {
    return { ok: false, error: FORMULARIO_CON_RESPUESTAS_ERROR }
  }

  const { error } = await supabase
    .from('formulario_preselector')
    .delete()
    .eq('puesto_id', puestoId)

  if (error) return { ok: false, error: 'No se pudo eliminar el formulario preselector.' }
  return { ok: true }
}
