'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import { getNotasPrivadas } from './queries'
import type { ActionResult } from '@/lib/types/domain'
import { marcarActividadPuesto } from '@/modules/puestos/actividad'

export type NotaData = {
  id: string
  contenido: string
  fecha_creacion: string
  updated_at: string
  puesto_id: string | null
  titulo_puesto: string | null
}

async function getReclutadorId(): Promise<string | null> {
  const session = await verifySession()
  const supabase = await createClient()
  const { data } = await supabase
    .from('perfil_reclutador')
    .select('id')
    .eq('usuario_id', session.id)
    .single()
  return data ? (data as { id: string }).id : null
}

export async function crearNota(
  postulanteId: string,
  contenido: string,
  puestoId?: string
): Promise<ActionResult<{ titulo_puesto: string | null }>> {
  const reclutadorId = await getReclutadorId()
  if (!reclutadorId) return { success: false, error: 'No autorizado.' }
  if (!contenido.trim()) return { success: false, error: 'La nota no puede estar vacía.' }

  const admin = createAdminClient()

  // La nota solo se etiqueta con un puesto si el llamador lo indica
  // explícitamente. Sin puesto, queda como nota suelta del postulante
  // (puesto_id = null): el reclutador puede querer anotar algo del candidato
  // sin asociarlo a ninguna postulación.
  const puestoIdFinal = puestoId ?? null
  let tituloPuesto: string | null = null
  if (puestoIdFinal) {
    const { data: puesto } = await admin.from('puesto')
      .select('titulo_puesto')
      .eq('id', puestoIdFinal)
      .eq('reclutador_id', reclutadorId)
      .maybeSingle()
    tituloPuesto = (puesto as { titulo_puesto: string } | null)?.titulo_puesto ?? null
  }

  const { error } = await admin.from('nota_privada').insert({
    reclutador_id: reclutadorId,
    postulante_id: postulanteId,
    puesto_id: puestoIdFinal,
    contenido: contenido.trim(),
  })

  if (error) return { success: false, error: 'No se pudo guardar la nota.' }

  // Guardar una nota sobre un candidato del puesto cuenta como actividad.
  await marcarActividadPuesto(puestoIdFinal)

  revalidatePath(`/reclutador/postulantes/${postulanteId}`)
  revalidatePath('/reclutador/postulaciones')
  return { success: true, data: { titulo_puesto: tituloPuesto } }
}

/** Notas privadas del reclutador para un postulante — versión llamable desde el cliente */
export async function getNotasDePostulante(
  postulanteId: string,
): Promise<ActionResult<NotaData[]>> {
  const reclutadorId = await getReclutadorId()
  if (!reclutadorId) return { success: false, error: 'No autorizado.' }
  const notas = await getNotasPrivadas(postulanteId)
  return { success: true, data: notas }
}

export async function editarNota(notaId: string, contenido: string): Promise<ActionResult> {
  const reclutadorId = await getReclutadorId()
  if (!reclutadorId) return { success: false, error: 'No autorizado.' }
  if (!contenido.trim()) return { success: false, error: 'La nota no puede estar vacía.' }

  const supabase = await createClient()
  const { error } = await supabase.from('nota_privada')
    .update({ contenido: contenido.trim() })
    .eq('id', notaId)
    .eq('reclutador_id', reclutadorId)

  if (error) return { success: false, error: 'No se pudo actualizar la nota.' }
  revalidatePath('/reclutador/postulantes')
  return { success: true, data: undefined }
}

export async function eliminarNota(notaId: string, postulanteId: string): Promise<ActionResult> {
  const reclutadorId = await getReclutadorId()
  if (!reclutadorId) return { success: false, error: 'No autorizado.' }

  const supabase = await createClient()
  const { error } = await supabase.from('nota_privada')
    .delete()
    .eq('id', notaId)
    .eq('reclutador_id', reclutadorId)

  if (error) return { success: false, error: 'No se pudo eliminar la nota.' }
  revalidatePath(`/reclutador/postulantes/${postulanteId}`)
  revalidatePath('/reclutador/postulaciones')
  revalidatePath('/reclutador/notas')
  return { success: true, data: undefined }
}
