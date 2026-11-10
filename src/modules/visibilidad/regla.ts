export interface RequisitosVisibilidad {
  existePerfil: boolean
  tieneDominante: boolean
  informeListo: boolean
}

export type ResultadoEvaluacionVisibilidad =
  | { ok: true }
  | { ok: false; error: string }

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
  if (!requisitos.existePerfil) {
    return {
      ok: false,
      error: 'No se encontró el perfil del postulante.',
    }
  }

  if (!requisitos.tieneDominante) {
    return {
      ok: false,
      error: 'Debés completar el test de personalidad antes de hacer visible tu perfil.',
    }
  }

  if (!requisitos.informeListo) {
    return {
      ok: false,
      error: 'Tu informe de personalidad debe estar listo antes de hacer visible tu perfil.',
    }
  }

  return { ok: true }
}
