'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import { aiProvider } from '@/lib/ai'
import { buildAsistentePrompts } from './prompts'
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
    .select('titulo_puesto, descripcion_texto, carga_horaria, ubicacion, perfil_psicologico_deseado')
    .eq('id', puestoId)
    .eq('reclutador_id', reclutadorId)
    .single()

  if (!puesto) return { success: false, error: 'Puesto no encontrado o no autorizado.' }

  const puestoTyped = puesto as {
    titulo_puesto: string
    descripcion_texto: string | null
    carga_horaria: string
    ubicacion: string
    perfil_psicologico_deseado: string | null
  }

  // Candidate basic data (eneatipo + HD come from joined tables)
  const { data: postulante } = await supabase
    .from('perfil_postulante')
    .select(`
      nombre_completo,
      test_eneagrama(eneatipo(numero_eneatipo, nombre)),
      human_design(tipo_energetico, autoridad_hd, perfil_hd, estrategia_hd)
    `)
    .eq('id', postulanteId)
    .single()

  if (!postulante) return { success: false, error: 'Postulante no encontrado.' }

  const postulanteTyped = postulante as {
    nombre_completo: string
    test_eneagrama: { eneatipo: { numero_eneatipo: number; nombre: string } | null } | null
    human_design: {
      tipo_energetico: string
      autoridad_hd: string
      perfil_hd: string
      estrategia_hd: string
    } | null
  }

  // Candidate skills
  const { data: pt } = await supabase
    .from('perfil_tecnico')
    .select('id')
    .eq('postulante_id', postulanteId)
    .maybeSingle()

  let competencias: string[] = []
  if (pt) {
    const { data: comps } = await supabase
      .from('postulante_competencia')
      .select('competencia(nombre)')
      .eq('perfil_tecnico_id', (pt as { id: string }).id)
    competencias = (comps ?? [])
      .map((c: unknown) => (c as { competencia: { nombre: string } | null }).competencia?.nombre)
      .filter((n): n is string => Boolean(n))
  }

  // Build prompts and call AI
  const ctx = {
    nombrePostulante: postulanteTyped.nombre_completo,
    eneatipoNumero: postulanteTyped.test_eneagrama?.eneatipo?.numero_eneatipo ?? null,
    eneatipoNombre: postulanteTyped.test_eneagrama?.eneatipo?.nombre ?? null,
    humanDesign: postulanteTyped.human_design,
    competencias,
    tituloPuesto: puestoTyped.titulo_puesto,
    descripcionPuesto: puestoTyped.descripcion_texto,
    cargaHoraria: puestoTyped.carga_horaria,
    ubicacion: puestoTyped.ubicacion,
    perfilPsicologicoDeseado: puestoTyped.perfil_psicologico_deseado,
    pregunta: pregunta.trim(),
  }

  const { systemPrompt, userPrompt } = buildAsistentePrompts(ctx)

  let respuesta: string
  try {
    const result = await aiProvider.generate({
      systemPrompt,
      userPrompt,
      maxTokens: 600,
      temperature: 0.5,
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

  // Log query for metrics — we intentionally do NOT store the full conversation to control costs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from('consulta_asistente_ia') as any).insert({
    reclutador_id: reclutadorId,
    postulante_id: postulanteId,
    puesto_id: puestoId,
    pregunta_reclutador: pregunta.trim().slice(0, 500),
    respuesta_ia: respuesta.slice(0, 2000),
    estado: 'LISTO',
  })

  return { success: true, data: { respuesta } }
}
