import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import { aiProvider } from '@/lib/ai'
import { informeToPlainText } from '@/modules/informe/format'
import type { InformePersonalidadJSON } from '@/lib/types/informe'
import {
  buildSeleccionPrompts,
  type CandidatoContexto,
  type InformeSeleccionJSON,
} from './prompts'

/** Límite de candidatos por consulta para controlar el costo en tokens. */
export const MAX_CANDIDATOS_SELECCION = 10

type ResultadoSeleccion =
  | { success: true; informe: InformeSeleccionJSON; tituloPuesto: string }
  | { success: false; error: string; status: number }

function extractJSON(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenceMatch) return fenceMatch[1].trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) return raw.slice(start, end + 1)
  return raw.trim()
}

function parseInformeSeleccion(raw: string): InformeSeleccionJSON | null {
  try {
    const p = JSON.parse(extractJSON(raw)) as InformeSeleccionJSON
    if (
      typeof p.resumenEjecutivo !== 'string' ||
      p.resumenEjecutivo.trim().length === 0 ||
      !Array.isArray(p.ranking) ||
      p.ranking.length === 0 ||
      !Array.isArray(p.justificaciones) ||
      !Array.isArray(p.menosRelevantes)
    ) {
      return null
    }
    return p
  } catch {
    return null
  }
}

/**
 * Genera el informe de selección grupal para un puesto: compara los candidatos
 * indicados y devuelve el JSON estructurado del ranking.
 *
 * No persiste nada: el informe se genera on-demand y se descarta.
 */
export async function generarInformeSeleccion(
  puestoId: string,
  postulanteIds: string[]
): Promise<ResultadoSeleccion> {
  const session = await verifySession()
  const supabase = await createClient()
  const admin = createAdminClient()

  if (postulanteIds.length === 0) {
    return { success: false, error: 'La lista de candidatos está vacía.', status: 400 }
  }
  if (postulanteIds.length > MAX_CANDIDATOS_SELECCION) {
    return {
      success: false,
      error: `El informe admite hasta ${MAX_CANDIDATOS_SELECCION} candidatos por consulta.`,
      status: 400,
    }
  }

  // Ownership: el puesto debe pertenecer al reclutador autenticado
  const { data: reclutador } = await supabase
    .from('perfil_reclutador')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!reclutador) return { success: false, error: 'No autorizado.', status: 403 }
  const reclutadorId = (reclutador as { id: string }).id

  const { data: puesto } = await supabase
    .from('puesto')
    .select(
      'titulo_puesto, descripcion_texto, carga_horaria, ubicacion, nivel_experiencia, perfil_psicologico_deseado'
    )
    .eq('id', puestoId)
    .eq('reclutador_id', reclutadorId)
    .single()

  if (!puesto) {
    return { success: false, error: 'Puesto no encontrado o no autorizado.', status: 404 }
  }

  const puestoTyped = puesto as {
    titulo_puesto: string
    descripcion_texto: string | null
    carga_horaria: string
    ubicacion: string
    nivel_experiencia: string | null
    perfil_psicologico_deseado: string | null
  }

  // Cada candidato debe haberse postulado a ESTE puesto: es la barrera que evita
  // pedir informes sobre postulantes ajenos al proceso.
  const { data: postulacionesRaw } = await admin
    .from('postulacion')
    .select('postulante_id')
    .eq('puesto_id', puestoId)
    .in('postulante_id', postulanteIds)

  const postuladosSet = new Set(
    ((postulacionesRaw ?? []) as { postulante_id: string }[]).map((p) => p.postulante_id)
  )
  const validos = [...new Set(postulanteIds)].filter((id) => postuladosSet.has(id))
  if (validos.length === 0) {
    return {
      success: false,
      error: 'Ningún candidato de la lista se postuló a este puesto.',
      status: 400,
    }
  }

  // Contexto por candidato (en paralelo): perfil técnico, informe, notas
  const candidatos: CandidatoContexto[] = await Promise.all(
    validos.map((postulanteId) => loadCandidatoContexto(admin, supabase, reclutadorId, puestoId, postulanteId))
  )

  const { systemPrompt, userPrompt } = buildSeleccionPrompts({
    tituloPuesto: puestoTyped.titulo_puesto,
    descripcionPuesto: puestoTyped.descripcion_texto,
    cargaHoraria: puestoTyped.carga_horaria,
    ubicacion: puestoTyped.ubicacion,
    nivelExperiencia: puestoTyped.nivel_experiencia,
    perfilPsicologicoDeseado: puestoTyped.perfil_psicologico_deseado,
    candidatos,
  })

  let raw: string
  try {
    const result = await aiProvider.generate({
      systemPrompt,
      userPrompt,
      responseFormat: 'json',
      maxTokens: 6000,
      temperature: 0.4,
    })
    raw = result.content
    console.info(
      `[seleccion] Tokens: ${result.usage.inputTokens} in + ${result.usage.outputTokens} out (${result.model})`
    )
  } catch (err) {
    console.error('[seleccion] Error IA:', err)
    return {
      success: false,
      error: 'El asistente no está disponible en este momento. Intentá más tarde.',
      status: 502,
    }
  }

  const informe = parseInformeSeleccion(raw)
  if (!informe) {
    console.error('[seleccion] Respuesta IA no parseable:', raw.slice(0, 300))
    return {
      success: false,
      error: 'No se pudo interpretar la respuesta del asistente. Intentá de nuevo.',
      status: 502,
    }
  }

  return { success: true, informe, tituloPuesto: puestoTyped.titulo_puesto }
}

/** Carga el contexto completo de un candidato (mismas fuentes que el asistente 1-a-1). */
async function loadCandidatoContexto(
  admin: ReturnType<typeof createAdminClient>,
  supabase: Awaited<ReturnType<typeof createClient>>,
  reclutadorId: string,
  puestoId: string,
  postulanteId: string
): Promise<CandidatoContexto> {
  const [{ data: postulanteRaw }, { data: ptRaw }, { data: informeRaw }, notasRes] =
    await Promise.all([
      admin
        .from('perfil_postulante')
        .select(
          'nombre_completo, test_eneagrama(test_eneagrama_dominante(eneatipo(numero_eneatipo, nombre)))'
        )
        .eq('id', postulanteId)
        .single(),
      admin.from('perfil_tecnico').select('id').eq('postulante_id', postulanteId).maybeSingle(),
      admin
        .from('informe_personalidad')
        .select('contenido_json')
        .eq('postulante_id', postulanteId)
        .eq('estado_informe', 'LISTO')
        .maybeSingle(),
      // Notas relevantes al puesto: las de este puesto + las generales (sin puesto)
      supabase
        .from('nota_privada')
        .select('contenido, puesto_id')
        .eq('reclutador_id', reclutadorId)
        .eq('postulante_id', postulanteId)
        .order('updated_at', { ascending: false })
        .limit(20),
    ])

  const postulanteTyped = postulanteRaw as {
    nombre_completo: string
    test_eneagrama: {
      test_eneagrama_dominante: { eneatipo: { numero_eneatipo: number; nombre: string } }[]
    } | null
  } | null

  let competencias: string[] = []
  let formaciones: CandidatoContexto['formaciones'] = []
  let experiencias: CandidatoContexto['experiencias'] = []

  if (ptRaw) {
    const ptId = (ptRaw as { id: string }).id
    const [compsRes, formRes, expRes] = await Promise.all([
      admin.from('postulante_competencia').select('competencia(nombre)').eq('perfil_tecnico_id', ptId),
      admin.from('formacion_academica').select('titulo, institucion, fecha_graduacion').eq('perfil_tecnico_id', ptId),
      admin
        .from('experiencia_laboral')
        .select('puesto, empresa, fecha_inicio, fecha_fin')
        .eq('perfil_tecnico_id', ptId)
        .order('fecha_inicio', { ascending: false }),
    ])

    competencias = (compsRes.data ?? [])
      .map((c: unknown) => (c as { competencia: { nombre: string } | null }).competencia?.nombre)
      .filter((n: unknown): n is string => Boolean(n))
    formaciones = (formRes.data ?? []) as CandidatoContexto['formaciones']
    experiencias = (expRes.data ?? []) as CandidatoContexto['experiencias']
  }

  const notasPrivadas = ((notasRes.data ?? []) as { contenido: string; puesto_id: string | null }[])
    .filter((n) => n.puesto_id === puestoId || n.puesto_id === null)
    .map((n) => n.contenido)
    .slice(0, 10)

  return {
    nombre: postulanteTyped?.nombre_completo ?? 'Candidato',
    eneatipoNumero:
      postulanteTyped?.test_eneagrama?.test_eneagrama_dominante[0]?.eneatipo?.numero_eneatipo ??
      null,
    eneatipoNombre:
      postulanteTyped?.test_eneagrama?.test_eneagrama_dominante[0]?.eneatipo?.nombre ?? null,
    competencias,
    formaciones,
    experiencias,
    informePersonalidad: informeRaw
      ? informeToPlainText(
          (informeRaw as { contenido_json: InformePersonalidadJSON | null }).contenido_json
        )
      : null,
    notasPrivadas,
  }
}
