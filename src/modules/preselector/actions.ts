'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import type { ActionResult } from '@/lib/types/domain'

export type RespuestaParaReclutador = {
  preguntaTexto: string
  esCritica: boolean
  respuestaTexto: string
  /** true when the question is critical and the chosen option is not a valid one. */
  fallidaCritica: boolean
}

/**
 * Respuestas del formulario preselector de una postulación, para mostrarle al reclutador.
 * Solo el reclutador dueño del puesto de la postulación puede verlas.
 */
export async function getRespuestasParaReclutador(
  postulacionId: string,
): Promise<ActionResult<RespuestaParaReclutador[]>> {
  const session = await verifySession()
  const supabase = await createClient()

  const { data: reclutador } = await supabase
    .from('perfil_reclutador')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!reclutador) return { success: false, error: 'No autorizado.' }
  const reclutadorId = (reclutador as { id: string }).id

  const admin = createAdminClient()
  const { data: postulacion } = await admin
    .from('postulacion')
    .select('id, puesto(reclutador_id)')
    .eq('id', postulacionId)
    .maybeSingle()

  const puesto = (postulacion as { puesto: { reclutador_id: string | null } | null } | null)?.puesto
  if (!puesto || puesto.reclutador_id !== reclutadorId) {
    return { success: false, error: 'No autorizado.' }
  }

  const { data, error } = await admin
    .from('respuesta_preselector')
    .select(
      'texto_libre, pregunta_preselector(texto, es_critica, orden), opcion_pregunta_preselector(texto, es_valida)',
    )
    .eq('postulacion_id', postulacionId)

  if (error) return { success: false, error: 'No se pudieron cargar las respuestas.' }

  const respuestas = ((data ?? []) as unknown[])
    .map((row) => {
      const r = row as {
        texto_libre: string | null
        pregunta_preselector: { texto: string; es_critica: boolean; orden: number } | null
        opcion_pregunta_preselector: { texto: string; es_valida: boolean } | null
      }
      return {
        orden: r.pregunta_preselector?.orden ?? 0,
        preguntaTexto: r.pregunta_preselector?.texto ?? '',
        esCritica: r.pregunta_preselector?.es_critica ?? false,
        respuestaTexto: r.opcion_pregunta_preselector?.texto ?? r.texto_libre ?? '—',
        fallidaCritica:
          (r.pregunta_preselector?.es_critica ?? false) &&
          r.opcion_pregunta_preselector?.es_valida !== true,
      }
    })
    .sort((a, b) => a.orden - b.orden)
    .map(({ orden: _orden, ...resto }) => resto)

  return { success: true, data: respuestas }
}
