/**
 * Niveles del certificado.
 *
 * El certificado agrupa dos cosas distintas bajo la misma escala visual:
 *   - Competencias destacadas → derivan del informe (motor de Eneagrama), que
 *     puntúa en 5 niveles (Alto … Bajo).
 *   - Habilidades técnicas → las carga el postulante en su perfil, en 3 niveles
 *     (BASICO / INTERMEDIO / AVANZADO).
 *
 * Ambas se proyectan a la misma escala de 3 —Avanzado / Medio / Básico— para
 * que el documento se lea como una sola tabla de dominio y no como dos escalas
 * mezcladas.
 */

import type { NivelCompetencia as NivelTecnico } from '@/lib/constants/enums'
import type { CompetenciaItem as CompetenciaInforme } from '@/lib/types/informe'

export const NIVELES_CERT = ['Avanzado', 'Medio', 'Básico'] as const
export type NivelCert = (typeof NIVELES_CERT)[number]

/** Nivel cargado por el postulante → etiqueta del certificado. */
export function nivelTecnicoACert(nivel: NivelTecnico | undefined): NivelCert {
  if (nivel === 'AVANZADO') return 'Avanzado'
  if (nivel === 'INTERMEDIO') return 'Medio'
  return 'Básico'
}

/** Máximo de competencias destacadas por nivel: el certificado es un anzuelo, no el informe. */
const MAX_DESTACADAS = { Avanzado: 4, Medio: 3 } as const

export type CompetenciaDestacada = { nombre: string; nivel: NivelCert }

/**
 * Competencias del informe → destacadas del certificado.
 * Alto/Medio-Alto pasan como "Avanzado" y Medio como "Medio"; lo que quedó por
 * debajo no entra (el certificado muestra fortalezas, el informe completo está
 * detrás del QR).
 */
export function destacadasDelInforme(competencias: CompetenciaInforme[] | undefined): CompetenciaDestacada[] {
  if (!competencias || competencias.length === 0) return []

  const avanzado = competencias
    .filter(c => c.nivel === 'Alto' || c.nivel === 'Medio-Alto')
    .sort((a, b) => b.barras - a.barras)
    .slice(0, MAX_DESTACADAS.Avanzado)
    .map(c => ({ nombre: c.nombre, nivel: 'Avanzado' as const }))

  const medio = competencias
    .filter(c => c.nivel === 'Medio')
    .sort((a, b) => b.barras - a.barras)
    .slice(0, MAX_DESTACADAS.Medio)
    .map(c => ({ nombre: c.nombre, nivel: 'Medio' as const }))

  return [...avanzado, ...medio]
}

/** Agrupa por nivel en el orden Avanzado → Medio → Básico, sin grupos vacíos. */
export function agruparPorNivel<T>(items: T[], nivelDe: (item: T) => NivelCert): { nivel: NivelCert; items: T[] }[] {
  return NIVELES_CERT.map(nivel => ({ nivel, items: items.filter(i => nivelDe(i) === nivel) })).filter(
    g => g.items.length > 0
  )
}

/** Primer párrafo de la prosa — la síntesis del certificado es un resumen, no el informe. */
export function primerParrafo(texto: string | undefined): string | undefined {
  if (!texto) return undefined
  const [primero] = texto.split(/\n\n+/).map(p => p.trim()).filter(Boolean)
  return primero
}
