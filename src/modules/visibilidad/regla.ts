export interface RequisitosVisibilidad {
  existePerfil: boolean
  tieneDominante: boolean
  informeListo: boolean
}

export type MotivoRechazoVisibilidad = 'sin_perfil' | 'sin_test' | 'informe_pendiente'

export type ResultadoEvaluacionVisibilidad =
  | { ok: true }
  | { ok: false; motivo: MotivoRechazoVisibilidad }

/**
 * Regla de negocio pura para evaluar si un perfil de postulante cumple las
 * condiciones para estar visible en el buscador de reclutadores (H-208 y H-215).
 *
 * Condiciones en orden:
 * 1. Debe existir el registro de perfil del postulante.
 * 2. Debe tener completado el test de eneagrama con al menos un dominante.
 * 3. El informe de personalidad debe encontrarse generado en estado LISTO.
 */
export function evaluarRequisitosVisibilidad(
  requisitos: RequisitosVisibilidad,
): ResultadoEvaluacionVisibilidad {
  if (!requisitos.existePerfil) return { ok: false, motivo: 'sin_perfil' }
  if (!requisitos.tieneDominante) return { ok: false, motivo: 'sin_test' }
  if (!requisitos.informeListo) return { ok: false, motivo: 'informe_pendiente' }
  return { ok: true }
}

/** Mensajes para el postulante que intenta hacer visible su propio perfil. */
export const MENSAJE_VISIBILIDAD_POSTULANTE: Record<MotivoRechazoVisibilidad, string> = {
  sin_perfil: 'No se encontró el perfil del postulante.',
  sin_test: 'Debés completar el test de personalidad antes de hacer visible tu perfil.',
  informe_pendiente: 'Tu informe de personalidad debe estar listo antes de hacer visible tu perfil.',
}
