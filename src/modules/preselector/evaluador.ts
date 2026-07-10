export type PreguntaParaEvaluar = {
  id: string
  texto: string
  esCritica: boolean
  opciones: { id: string; esValida: boolean }[]
}

export type RespuestaParaEvaluar = {
  preguntaId: string
  opcionId: string | null
}

export type PreguntaFallada = { preguntaId: string; texto: string }

export type ResultadoEvaluacion =
  | { aprobado: true }
  | { aprobado: false; preguntasFalladas: PreguntaFallada[] }

/**
 * Pure evaluation of critical questions: a critical question fails if it
 * wasn't answered, or was answered with an option that isn't marked as valid.
 * Non-critical questions never affect the result, regardless of the answer.
 */
export function evaluarRespuestasCriticas(
  preguntas: PreguntaParaEvaluar[],
  respuestas: RespuestaParaEvaluar[]
): ResultadoEvaluacion {
  const respuestaPorPregunta = new Map(respuestas.map((r) => [r.preguntaId, r]))
  const preguntasFalladas: PreguntaFallada[] = []

  for (const pregunta of preguntas) {
    if (!pregunta.esCritica) continue

    const respuesta = respuestaPorPregunta.get(pregunta.id)
    if (!respuesta || !respuesta.opcionId) {
      preguntasFalladas.push({ preguntaId: pregunta.id, texto: pregunta.texto })
      continue
    }

    const opcion = pregunta.opciones.find((o) => o.id === respuesta.opcionId)
    if (!opcion || !opcion.esValida) {
      preguntasFalladas.push({ preguntaId: pregunta.id, texto: pregunta.texto })
    }
  }

  if (preguntasFalladas.length > 0) {
    return { aprobado: false, preguntasFalladas }
  }
  return { aprobado: true }
}

/** Builds the Spanish reason stored in postulacion.motivo_descarte. */
export function construirMotivoDescarte(preguntasFalladas: PreguntaFallada[]): string {
  const textos = preguntasFalladas.map((p) => `"${p.texto}"`).join(', ')
  return `Descarte automático: no cumplió con la(s) pregunta(s) eliminatoria(s) ${textos}.`
}
