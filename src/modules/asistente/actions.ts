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

  // --- Load all candidate data via admin client (bypasses RLS; candidate may not be actively searching) ---

  // Load all candidate data via admin client (bypasses RLS — candidate may not be actively searching)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: postulanteRaw } = await (admin as any)
    .from('perfil_postulante')
    .select(`
      nombre_completo,
      test_eneagrama(test_eneagrama_dominante(eneatipo(numero_eneatipo, nombre)))
    `)
    .eq('id', postulanteId)
    .single()

  if (!postulanteRaw) return { success: false, error: 'Postulante no encontrado.' }

  const postulanteTyped = postulanteRaw as {
    nombre_completo: string
    test_eneagrama: {
      test_eneagrama_dominante: { eneatipo: { numero_eneatipo: number; nombre: string } }[]
    } | null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ptRaw } = await (admin as any)
    .from('perfil_tecnico')
    .select('id')
    .eq('postulante_id', postulanteId)
    .maybeSingle()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: informeRaw } = await (admin as any)
    .from('informe_personalidad')
    .select('contenido_informe')
    .eq('postulante_id', postulanteId)
    .eq('estado_informe', 'LISTO')
    .maybeSingle()

  const notasRes = await supabase
    .from('nota_privada')
    .select('contenido')
    .eq('reclutador_id', reclutadorId)
    .eq('postulante_id', postulanteId)
    .order('updated_at', { ascending: false })
    .limit(10)

  // Load technical profile details if a perfil_tecnico exists
  let competencias: string[] = []
  let formaciones: { titulo: string; institucion: string; fecha_graduacion: string | null }[] = []
  let experiencias: { puesto: string; empresa: string; fecha_inicio: string; fecha_fin: string | null }[] = []

  if (ptRaw) {
    const ptId = (ptRaw as { id: string }).id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [compsRes, formRes, expRes] = await Promise.all([
      (admin as any).from('postulante_competencia').select('competencia(nombre)').eq('perfil_tecnico_id', ptId),
      (admin as any).from('formacion_academica').select('titulo, institucion, fecha_graduacion').eq('perfil_tecnico_id', ptId),
      (admin as any).from('experiencia_laboral').select('puesto, empresa, fecha_inicio, fecha_fin').eq('perfil_tecnico_id', ptId).order('fecha_inicio', { ascending: false }),
    ])

    competencias = (compsRes.data ?? [])
      .map((c: unknown) => (c as { competencia: { nombre: string } | null }).competencia?.nombre)
      .filter((n: unknown): n is string => Boolean(n))

    formaciones = (formRes.data ?? []) as typeof formaciones
    experiencias = (expRes.data ?? []) as typeof experiencias
  }

  const informePersonalidad = informeRaw
    ? (informeRaw as { contenido_informe: string | null }).contenido_informe
    : null

  const notasPrivadas = (notasRes.data ?? []).map(
    (n: unknown) => (n as { contenido: string }).contenido
  )

  // Build prompts and call AI
  const ctx = {
    nombrePostulante: postulanteTyped.nombre_completo,
    eneatipoNumero:
      postulanteTyped.test_eneagrama?.test_eneagrama_dominante[0]?.eneatipo?.numero_eneatipo ?? null,
    eneatipoNombre:
      postulanteTyped.test_eneagrama?.test_eneagrama_dominante[0]?.eneatipo?.nombre ?? null,
    competencias,
    formaciones,
    experiencias,
    informePersonalidad,
    tituloPuesto: puestoTyped.titulo_puesto,
    descripcionPuesto: puestoTyped.descripcion_texto,
    cargaHoraria: puestoTyped.carga_horaria,
    ubicacion: puestoTyped.ubicacion,
    nivelExperiencia: puestoTyped.nivel_experiencia,
    perfilPsicologicoDeseado: puestoTyped.perfil_psicologico_deseado,
    notasPrivadas,
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
