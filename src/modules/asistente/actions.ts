'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import { aiProvider } from '@/lib/ai'
import { buildAsistentePrompts } from './prompts'
import { cargarContextoCandidato } from '@/modules/seleccion/contexto-candidato'
import type { CandidatoContexto } from '@/modules/seleccion/prompts'
import type { ActionResult } from '@/lib/types/domain'

export async function consultarAsistente(
  postulanteId: string,
  puestoId: string,
  pregunta: string
): Promise<ActionResult<{ respuesta: string }>> {
  const session = await verifySession()
  const supabase = await createClient()
  const admin = createAdminClient()

  if (!pregunta.trim()) return { success: false, error: 'Ingresá una pregunta.' }

  // Verify the recruiter owns the given position
  const { data: reclutador } = await supabase
    .from('perfil_reclutador')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!reclutador) return { success: false, error: 'No autorizado.' }
  const reclutadorId = (reclutador as { id: string }).id

  const { data: puesto } = await supabase
    .from('puesto')
    .select('titulo_puesto, descripcion_texto, carga_horaria, ubicacion, nivel_experiencia, perfil_psicologico_deseado')
    .eq('id', puestoId)
    .eq('reclutador_id', reclutadorId)
    .single()

  if (!puesto) return { success: false, error: 'Puesto no encontrado o no autorizado.' }

  const puestoTyped = puesto as {
    titulo_puesto: string
    descripcion_texto: string | null
    carga_horaria: string
    ubicacion: string
    nivel_experiencia: string | null
    perfil_psicologico_deseado: string | null
  }

  // Mismo contexto que el informe de selección grupal: perfil técnico, bloque de
  // personalidad (motor V2 + narrativa) y notas de este puesto o generales.
  let candidato: CandidatoContexto
  try {
    candidato = await cargarContextoCandidato(admin, supabase, reclutadorId, puestoId, postulanteId)
  } catch (err) {
    console.error('[asistente] Error cargando el contexto del postulante:', err)
    return { success: false, error: 'No se pudo cargar la información del postulante.' }
  }

  const ctx = {
    candidato,
    tituloPuesto: puestoTyped.titulo_puesto,
    descripcionPuesto: puestoTyped.descripcion_texto,
    cargaHoraria: puestoTyped.carga_horaria,
    ubicacion: puestoTyped.ubicacion,
    nivelExperiencia: puestoTyped.nivel_experiencia,
    perfilPsicologicoDeseado: puestoTyped.perfil_psicologico_deseado,
    pregunta: pregunta.trim(),
  }

  const { systemPrompt, userPrompt } = buildAsistentePrompts(ctx)

  let respuesta: string
  try {
    const result = await aiProvider.generate({
      systemPrompt,
      userPrompt,
      maxTokens: 1200,
      temperature: 0.4,
      responseFormat: 'text',
    })
    respuesta = result.content
    console.info(
      `[asistente] Tokens: ${result.usage.inputTokens} in + ${result.usage.outputTokens} out (${result.model})`
    )
  } catch (err) {
    console.error('[asistente] Error IA:', err)
    return {
      success: false,
      error: 'El asistente no está disponible en este momento. Intentá más tarde.',
    }
  }

  // Log query for metrics — full conversation is intentionally not stored to control costs
  await admin.from('consulta_asistente_ia').insert({
    reclutador_id: reclutadorId,
    postulante_id: postulanteId,
    puesto_id: puestoId,
    pregunta_reclutador: pregunta.trim().slice(0, 500),
    respuesta_ia: respuesta.slice(0, 2000),
    estado: 'LISTO',
  })

  return { success: true, data: { respuesta } }
}
