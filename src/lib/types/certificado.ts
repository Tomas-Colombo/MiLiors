/**
 * Tipos de la síntesis integrada del certificado.
 *
 * El certificado combina el Informe de Personalidad (condensado) con el perfil
 * técnico (experiencia + competencias) en una prosa en 3ª persona. El LLM SOLO
 * devuelve la prosa y la lista de competencias que logró integrar; el código
 * calcula las NO integradas (garantía anti-pérdida) restando las integradas del
 * total de competencias técnicas vigentes.
 */

/** Salida del LLM + metadata, persistida en `perfil_tecnico.sintesis_certificado`. */
export type CertificadoSintesisJSON = {
  /** 2-3 párrafos en 3ª persona: personalidad + trayectoria técnica entrelazadas. */
  perfilIntegrado: string
  /** Nombres EXACTOS de las competencias técnicas que la prosa ya menciona. */
  competenciasIntegradas: string[]
  /** ISO de cuándo se generó — para detectar si el informe quedó más nuevo (desactualizada). */
  generadaAt?: string
}

export type SintesisEstado = 'PENDIENTE' | 'LISTO' | 'ERROR'
