import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import { getReclutadorId } from '@/modules/empresas/queries'
import { aiProvider } from '@/lib/ai'
import { AIError } from '@/lib/ai/port'
import { MAX_CANDIDATOS_SELECCION } from './constants'
import { cargarContextoCandidato } from './contexto-candidato'
import {
  buildSeleccionPrompts,
  type CandidatoContexto,
  type InformeSeleccionJSON,
} from './prompts'

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
  await verifySession()
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
  const reclutadorId = await getReclutadorId()
  if (!reclutadorId) return { success: false, error: 'No autorizado.', status: 403 }

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
  // Si falta un dato clave de un candidato se corta todo el informe: un ranking
  // armado con datos silenciosamente incompletos sería engañoso.
  let candidatos: CandidatoContexto[]
  try {
    candidatos = await Promise.all(
      validos.map((postulanteId) => cargarContextoCandidato(admin, supabase, reclutadorId, puestoId, postulanteId))
    )
  } catch (err) {
    console.error('[seleccion/service] Error cargando el contexto de los candidatos:', err)
    return {
      success: false,
      error: 'No se pudo cargar la información de los candidatos. Intentá de nuevo.',
      status: 500,
    }
  }

  const { systemPrompt, userPrompt } = buildSeleccionPrompts({
    tituloPuesto: puestoTyped.titulo_puesto,
    descripcionPuesto: puestoTyped.descripcion_texto,
    cargaHoraria: puestoTyped.carga_horaria,
    ubicacion: puestoTyped.ubicacion,
    nivelExperiencia: puestoTyped.nivel_experiencia,
    perfilPsicologicoDeseado: puestoTyped.perfil_psicologico_deseado,
    candidatos,
  })

  let raw = ''
  const MAX_INTENTOS = 2
  const TIMEOUT_MS = 120_000
  const ESPERA_REINTENTO_MS = 2_000

  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    try {
      const result = await aiProvider.generate({
        systemPrompt,
        userPrompt,
        responseFormat: 'json',
        maxTokens: 6000,
        temperature: 0.4,
        timeoutMs: TIMEOUT_MS,
      })
      raw = result.content
      console.info(
        `[seleccion] Intento ${intento}/${MAX_INTENTOS} — Tokens: ${result.usage.inputTokens} in + ${result.usage.outputTokens} out (${result.model})`
      )
      break
    } catch (err) {
      const esTransitorio = err instanceof AIError && err.transitorio
      console.error(
        `[seleccion] Intento ${intento}/${MAX_INTENTOS} — Error IA (${err instanceof AIError ? err.kind : 'no-AIError'}):`,
        err
      )

      if (esTransitorio && intento < MAX_INTENTOS) {
        console.info(`[seleccion] Reintentando tras ${ESPERA_REINTENTO_MS}ms por error transitorio...`)
        await new Promise((resolve) => setTimeout(resolve, ESPERA_REINTENTO_MS))
        continue
      }

      return {
        success: false,
        error: 'El asistente no está disponible en este momento. Intentá más tarde.',
        status: 502,
      }
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
