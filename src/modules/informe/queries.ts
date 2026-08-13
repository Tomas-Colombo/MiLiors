import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getConfiguracionSistema } from '@/modules/configuracion/queries'
import type { InformePersonalidadJSON } from '@/lib/types/informe'

export type InformeData = {
  id: string
  contenido_json: InformePersonalidadJSON | null
  estado_informe: 'PENDIENTE' | 'LISTO' | 'ERROR'
  fecha_generacion: string
  updated_at: string
  desactualizado: boolean
}

export const getInformeActual = cache(async (): Promise<InformeData | null> => {
  const session = await verifySession()
  const supabase = await createClient()

  const { data: postulante } = await supabase
    .from('perfil_postulante')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!postulante) return null

  const { data } = await supabase
    .from('informe_personalidad')
    .select('id, contenido_json, estado_informe, fecha_generacion, updated_at, desactualizado')
    .eq('postulante_id', (postulante as { id: string }).id)
    .single()

  return data ? (data as unknown as InformeData) : null
})

/** Valoración direccional de una competencia, desde la perspectiva del motor. */
export type ValoracionCompetencia = 'SUBESTIMA' | 'JUSTO' | 'SOBRESTIMA'

export type FeedbackInforme = {
  /** competencia_key → valoración ya guardada. */
  competencias: Record<string, ValoracionCompetencia>
  global: { representatividad: number; comentario: string | null } | null
  /**
   * Si el cuadro de opinión global se ofrece ahora. Falso mientras corre el
   * período de reactivación configurado por el admin.
   */
  puedeOpinar: boolean
  /** ISO en que vuelve a abrirse. null cuando ya está abierto. */
  reabreAt: string | null
}

/**
 * Feedback que el postulante ya dejó sobre su informe vigente, para que la UI
 * muestre lo elegido en lugar de arrancar en blanco cada visita.
 *
 * Se descarta el feedback anterior a la última regeneración: valorar un nivel
 * que ya no está en pantalla confundiría al postulante y ensuciaría el agregado.
 * Ese mismo descarte reabre el cuadro global aunque el período de reactivación
 * siga corriendo: es otro informe, la opinión anterior no aplica.
 */
export const getFeedbackInforme = cache(async (
  informeId: string,
  generadoAt: string,
): Promise<FeedbackInforme> => {
  await verifySession()
  const supabase = await createClient()

  const [{ data: comps }, { data: global }, config] = await Promise.all([
    supabase
      .from('feedback_informe_competencia')
      .select('competencia_key, valoracion, informe_generado_at')
      .eq('informe_id', informeId),
    supabase
      .from('feedback_informe')
      .select('representatividad, comentario, informe_generado_at, updated_at')
      .eq('informe_id', informeId)
      .maybeSingle(),
    getConfiguracionSistema(),
  ])

  const vigente = (fila: { informe_generado_at: string }) => fila.informe_generado_at >= generadoAt

  const competencias: Record<string, ValoracionCompetencia> = {}
  for (const fila of (comps ?? []) as { competencia_key: string; valoracion: ValoracionCompetencia; informe_generado_at: string }[]) {
    if (vigente(fila)) competencias[fila.competencia_key] = fila.valoracion
  }

  const globalTyped = global as {
    representatividad: number
    comentario: string | null
    informe_generado_at: string
    updated_at: string
  } | null

  const respuestaVigente = globalTyped && vigente(globalTyped) ? globalTyped : null

  // Sin respuesta vigente el cuadro está abierto. Con respuesta, se reabre
  // recién cuando pasa el período configurado desde que la dejó.
  const reabre = respuestaVigente
    ? new Date(
        new Date(respuestaVigente.updated_at).getTime() +
          config.diasReactivarFeedback * 24 * 60 * 60 * 1000,
      )
    : null
  const puedeOpinar = !reabre || reabre.getTime() <= Date.now()

  return {
    competencias,
    global: respuestaVigente
      ? { representatividad: respuestaVigente.representatividad, comentario: respuestaVigente.comentario }
      : null,
    puedeOpinar,
    reabreAt: puedeOpinar ? null : reabre!.toISOString(),
  }
})
