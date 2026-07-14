'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import type { ActionResult } from '@/lib/types/domain'
import { marcarActividadPuesto } from '@/modules/puestos/actividad'

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

  // Etiquetamos la nota con un puesto para que se pueda distinguir a qué
  // postulación pertenece cuando el candidato aplicó a varias. Si el llamador
  // no indica un puesto, usamos el de la última postulación del candidato a
  // una búsqueda de este reclutador.
  let puestoIdFinal = puestoId ?? null
  let tituloPuesto: string | null = null
  if (!puestoIdFinal) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: ultima } = await (admin.from('postulacion') as any)
      .select('puesto_id, puesto!inner(titulo_puesto, reclutador_id)')
      .eq('postulante_id', postulanteId)
      .eq('puesto.reclutador_id', reclutadorId)
      .order('fecha_postulacion', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (ultima) {
      const row = ultima as {
        puesto_id: string
        puesto: { titulo_puesto: string } | null
      }
      puestoIdFinal = row.puesto_id
      tituloPuesto = row.puesto?.titulo_puesto ?? null
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('nota_privada') as any).insert({
    reclutador_id: reclutadorId,
    postulante_id: postulanteId,
    puesto_id: puestoIdFinal,
    contenido: contenido.trim(),
  })

  if (error) return { success: false, error: 'No se pudo guardar la nota.' }

  // Guardar una nota sobre un candidato del puesto cuenta como actividad.
  await marcarActividadPuesto(puestoIdFinal)

  revalidatePath(`/reclutador/postulantes/${postulanteId}`)
  return { success: true, data: { titulo_puesto: tituloPuesto } }
}

export async function editarNota(notaId: string, contenido: string): Promise<ActionResult> {
  const reclutadorId = await getReclutadorId()
  if (!reclutadorId) return { success: false, error: 'No autorizado.' }
  if (!contenido.trim()) return { success: false, error: 'La nota no puede estar vacía.' }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('nota_privada') as any)
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('nota_privada') as any)
    .delete()
    .eq('id', notaId)
    .eq('reclutador_id', reclutadorId)

  if (error) return { success: false, error: 'No se pudo eliminar la nota.' }
  revalidatePath(`/reclutador/postulantes/${postulanteId}`)
  revalidatePath('/reclutador/notas')
  return { success: true, data: undefined }
}
