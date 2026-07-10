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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: formulario, error: insertFormError } = await (supabase.from('formulario_preselector') as any)
    .insert({ puesto_id: puestoId })
    .select('id')
    .single()

  if (insertFormError || !formulario) {
    return { ok: false, error: 'No se pudo crear el formulario preselector.' }
  }

  const formularioId = (formulario as { id: string }).id

  for (let i = 0; i < input.preguntas.length; i++) {
    const pregunta = input.preguntas[i]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: preguntaRow, error: preguntaError } = await (supabase.from('pregunta_preselector') as any)
      .insert({
        formulario_id: formularioId,
        texto: pregunta.texto,
        tipo: pregunta.tipo,
        es_critica: pregunta.esCritica,
        orden: i,
      })
      .select('id')
      .single()

    if (preguntaError || !preguntaRow) {
      return { ok: false, error: 'No se pudo guardar una pregunta del formulario.' }
    }

    if (pregunta.opciones && pregunta.opciones.length > 0) {
      const preguntaId = (preguntaRow as { id: string }).id

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: opcionesError } = await (supabase.from('opcion_pregunta_preselector') as any).insert(
        pregunta.opciones.map((opcion, idx) => ({
          pregunta_id: preguntaId,
          texto: opcion.texto,
          es_valida: opcion.esValida,
          orden: idx,
        }))
      )

      if (opcionesError) {
        return { ok: false, error: 'No se pudieron guardar las opciones de una pregunta.' }
      }
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
