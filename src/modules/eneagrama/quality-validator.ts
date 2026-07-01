import type { NumeroEneatipo } from './calculator'

// ─── Umbrales configurables ───────────────────────────────────────────────────
// Cambiar sólo este bloque para ajustar los umbrales. Los tres son independientes:
// basta que uno se dispare para marcar el test como inválido.

/** Máximo de eneatipos empatados que producen un resultado válido (Regla A). */
const MAX_DOMINANTES_EMPATE = 3

/**
 * Proporción máxima de respuestas que puede concentrar una sola opción (1–5) (Regla B).
 * Por encima de este valor el patrón es demasiado plano para discriminar tipos.
 * Ejemplo: 0.90 → inválido si una opción supera el 90 % de las 135 respuestas.
 */
const MAX_CONCENTRACION_OPCION = 0.90

/**
 * Desviación estándar mínima del vector de respuestas en escala 1–5 (Regla C).
 * Valor inicial: 0.5 — puede ajustarse si el corte resulta demasiado o poco exigente.
 * Por debajo de este umbral el candidato no discriminó suficientemente entre afirmaciones.
 */
const MIN_STD_DESVIACION = 0.5

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type MotivoInvalido = 'tope_empate' | 'concentracion' | 'baja_variacion'

export type ValidacionCalidad =
  | { valido: true }
  | { valido: false; motivo: MotivoInvalido }

// ─── Utilidades matemáticas puras ────────────────────────────────────────────

function stdDesviacion(valores: number[]): number {
  const n = valores.length
  if (n === 0) return 0
  const media = valores.reduce((s, v) => s + v, 0) / n
  const varianza = valores.reduce((s, v) => s + (v - media) ** 2, 0) / n
  return Math.sqrt(varianza)
}

function concentracionMaximaOpcion(valores: number[]): number {
  if (valores.length === 0) return 0
  const conteo: Record<number, number> = {}
  for (const v of valores) conteo[v] = (conteo[v] ?? 0) + 1
  return Math.max(...Object.values(conteo)) / valores.length
}

// ─── Función principal ────────────────────────────────────────────────────────

/**
 * Evalúa la calidad estadística de las respuestas del Eneagrama.
 * Debe llamarse DESPUÉS de calcularResultadoEneagrama y ANTES de persistir el resultado.
 *
 * @param valoresRespuesta  Los 135 valores numéricos (1–5) respondidos por el candidato.
 * @param dominantes        Eneatipos dominantes calculados por calcularResultadoEneagrama.
 * @returns { valido: true } si el test es aceptable,
 *          { valido: false; motivo } con el primer incumplimiento detectado (orden A → B → C).
 */
export function validarCalidadTest(
  valoresRespuesta: number[],
  dominantes: NumeroEneatipo[]
): ValidacionCalidad {
  // Regla A — Tope de empate
  if (dominantes.length > MAX_DOMINANTES_EMPATE) {
    return { valido: false, motivo: 'tope_empate' }
  }

  // Regla B — Concentración en una sola opción
  if (concentracionMaximaOpcion(valoresRespuesta) > MAX_CONCENTRACION_OPCION) {
    return { valido: false, motivo: 'concentracion' }
  }

  // Regla C — Desviación estándar baja
  if (stdDesviacion(valoresRespuesta) < MIN_STD_DESVIACION) {
    return { valido: false, motivo: 'baja_variacion' }
  }

  return { valido: true }
}
