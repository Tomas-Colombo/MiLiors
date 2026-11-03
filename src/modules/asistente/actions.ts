'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import { getReclutadorId } from '@/modules/empresas/queries'
import { aiProvider } from '@/lib/ai'
import { buildAsistentePrompts } from './prompts'
import { cargarContextoCandidato } from '@/modules/seleccion/contexto-candidato'
import type { CandidatoContexto } from '@/modules/seleccion/prompts'
import type { ActionResult } from '@/lib/types/domain'

const LIMITE_CONSULTAS_HORA = 20
const LIMITE_CONSULTAS_DIA = 100

export type CuotaAsistenteResultado =
  | { permitida: true }
  | { permitida: false; error: string }

/**
 * Evalúa si el reclutador superó la cuota de consultas al asistente en la última hora o día (H-221).
 */
export async function evaluarCuotaAsistente(
  conteoHora: number,
  conteoDia: number
): Promise<CuotaAsistenteResultado> {
  if (conteoHora >= LIMITE_CONSULTAS_HORA) {
    return {
      permitida: false,
      error: 'Alcanzaste el límite de consultas al asistente (20 por hora). Probá de nuevo más tarde.',
    }
  }
  if (conteoDia >= LIMITE_CONSULTAS_DIA) {
    return {
      permitida: false,
      error: 'Alcanzaste el límite de consultas al asistente (100 por día). Probá de nuevo más tarde.',
    }
  }
  return { permitida: true }
}

export async function consultarAsistente(
  postulanteId: string,
  puestoId: string,
  pregunta: string
): Promise<ActionResult<{ respuesta: string }>> {
  await verifySession()
  const supabase = await createClient()
  const admin = createAdminClient()

  if (!pregunta.trim()) return { success: false, error: 'Ingresá una pregunta.' }

  // Verify the recruiter owns the given position
  const reclutadorId = await getReclutadorId()
  if (!reclutadorId) return { success: false, error: 'No autorizado.' }

  const { data: puesto } = await supabase
    .from('puesto')
    .select('titulo_puesto, descripcion_texto, carga_horaria, ubicacion, nivel_experiencia, perfil_psicologico_deseado')
    .eq('id', puestoId)
    .eq('reclutador_id', reclutadorId)
    .single()

  if (!puesto) return { success: false, error: 'Puesto no encontrado o no autorizado.' }

  // El candidato también tiene que ser del reclutador: mismo criterio que la
  // página del asistente (se postuló a alguno de sus puestos). Sin esto, como los
  // datos se leen con service role, cualquier id exponía el informe del candidato.
  const { data: postulacionPropia } = await admin
    .from('postulacion')
    .select('id, puesto!inner(reclutador_id)')
    .eq('postulante_id', postulanteId)
    .eq('puesto.reclutador_id', reclutadorId)
    .limit(1)
    .maybeSingle()

  if (!postulacionPropia) return { success: false, error: 'Postulante no encontrado o no autorizado.' }

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

  // Control de cuota por reclutador (H-221): 20 consultas/hora, 100 consultas/día
  const ahora = new Date()
  const unaHoraAtras = new Date(ahora.getTime() - 60 * 60 * 1000).toISOString()
  const unDiaAtras = new Date(ahora.getTime() - 24 * 60 * 60 * 1000).toISOString()

  const [resHora, resDia] = await Promise.all([
    admin
      .from('consulta_asistente_ia')
      .select('id', { count: 'exact', head: true })
      .eq('reclutador_id', reclutadorId)
      .gte('fecha_consulta', unaHoraAtras),
    admin
      .from('consulta_asistente_ia')
      .select('id', { count: 'exact', head: true })
      .eq('reclutador_id', reclutadorId)
      .gte('fecha_consulta', unDiaAtras),
  ])

  if (resHora.error || resDia.error) {
    console.error('[asistente] Error verificando cuota de consultas:', resHora.error || resDia.error)
    return {
      success: false,
      error: 'No se pudo verificar el límite de consultas. Intentá más tarde.',
    }
  }

  const cuota = await evaluarCuotaAsistente(resHora.count ?? 0, resDia.count ?? 0)
  if (!cuota.permitida) {
    return { success: false, error: cuota.error }
  }

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
  const { error: insertError } = await admin.from('consulta_asistente_ia').insert({
    reclutador_id: reclutadorId,
    postulante_id: postulanteId,
    puesto_id: puestoId,
    pregunta_reclutador: pregunta.trim().slice(0, 500),
    respuesta_ia: respuesta.slice(0, 2000),
    estado: 'LISTO',
  })

  if (insertError) {
    console.error('[asistente] Error al registrar métricas de consulta:', insertError)
  }

  return { success: true, data: { respuesta } }
}
