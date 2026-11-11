/**
 * Control de cuota y rate limiting para endpoints y servicios de IA (H-221).
 *
 * Función pura genérica para evaluar límites por hora y por día sobre ventanas
 * temporales móviles (corridas), independiente de la zona horaria.
 */

export type CuotaResultado =
  | { permitida: true }
  | { permitida: false; error: string }

export interface CuotaConfig {
  limiteHora: number
  limiteDia: number
  etiqueta: string
}

export function evaluarCuota(
  conteoHora: number,
  conteoDia: number,
  config: CuotaConfig
): CuotaResultado {
  if (conteoHora >= config.limiteHora) {
    return {
      permitida: false,
      error: `Alcanzaste el límite de ${config.etiqueta} (${config.limiteHora} por hora). Probá de nuevo más tarde.`,
    }
  }
  if (conteoDia >= config.limiteDia) {
    return {
      permitida: false,
      error: `Alcanzaste el límite de ${config.etiqueta} (${config.limiteDia} por día). Probá de nuevo más tarde.`,
    }
  }
  return { permitida: true }
}
