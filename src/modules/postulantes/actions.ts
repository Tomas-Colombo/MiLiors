'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { getReclutadorId } from '@/modules/empresas/queries'
import { getNotasPrivadas } from './queries'
import type { ActionResult } from '@/lib/types/domain'
import { marcarActividadPuesto } from '@/modules/puestos/actividad'
import { notaContenidoSchema } from './schema'
import { logAuditoria } from '@/lib/logger'

export type NotaData = {
  id: string
  contenido: string
  fecha_creacion: string
  updated_at: string
  puesto_id: string | null
  titulo_puesto: string | null
}

export async function crearNota(
  postulanteId: string,
  contenido: string,
  puestoId?: string
): Promise<ActionResult<{ titulo_puesto: string | null }>> {
  const reclutadorId = await getReclutadorId()
  if (!reclutadorId) return { success: false, error: 'No autorizado.' }

  const parseResult = notaContenidoSchema.safeParse(contenido)
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0]?.message ?? 'La nota no puede estar vacía.' }
  }
  const contenidoValido = parseResult.data

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
    // Un puesto ajeno no se puede etiquetar en la nota ni marcarle actividad
    // (eso le frenaría el cierre automático a otro reclutador).
    if (!puesto) return { success: false, error: 'No autorizado.' }
    tituloPuesto = (puesto as { titulo_puesto: string }).titulo_puesto
  }

  const { data: nota, error } = await admin.from('nota_privada').insert({
    reclutador_id: reclutadorId,
    postulante_id: postulanteId,
    puesto_id: puestoIdFinal,
    contenido: contenidoValido,
  }).select('id').single()

  if (error || !nota) return { success: false, error: 'No se pudo guardar la nota.' }

  // Guardar una nota sobre un candidato del puesto cuenta como actividad.
  await marcarActividadPuesto(puestoIdFinal)

  logAuditoria({
    usuarioId: reclutadorId,
    accion: 'crear_nota',
    entidad: 'nota_privada',
    entidadId: nota.id,
    detalle: { postulanteId, puestoId: puestoIdFinal },
  })

  revalidatePath(`/reclutador/postulantes/${postulanteId}`)
  revalidatePath('/reclutador/postulaciones')
  revalidatePath('/reclutador/notas')
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

  const parseResult = notaContenidoSchema.safeParse(contenido)
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0]?.message ?? 'La nota no puede estar vacía.' }
  }
  const contenidoValido = parseResult.data

  const supabase = await createClient()
  const { data, error } = await supabase.from('nota_privada')
    .update({ contenido: contenidoValido })
    .eq('id', notaId)
    .eq('reclutador_id', reclutadorId)
    .select('postulante_id')
    .maybeSingle()

  if (error || !data) return { success: false, error: 'No se pudo actualizar la nota.' }

  const postulanteId = (data as { postulante_id: string }).postulante_id
  logAuditoria({
    usuarioId: reclutadorId,
    accion: 'editar_nota',
    entidad: 'nota_privada',
    entidadId: notaId,
    detalle: { postulanteId },
  })
  revalidatePath('/reclutador/postulantes')
  revalidatePath(`/reclutador/postulantes/${postulanteId}`)
  revalidatePath('/reclutador/postulaciones')
  revalidatePath('/reclutador/notas')
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

  logAuditoria({
    usuarioId: reclutadorId,
    accion: 'eliminar_nota',
    entidad: 'nota_privada',
    entidadId: notaId,
    detalle: { postulanteId },
  })

  revalidatePath(`/reclutador/postulantes/${postulanteId}`)
  revalidatePath('/reclutador/postulaciones')
  revalidatePath('/reclutador/notas')
  return { success: true, data: undefined }
}
