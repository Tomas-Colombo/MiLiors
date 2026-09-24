/**
 * Niveles del certificado.
 *
 * Solo las habilidades técnicas tienen nivel: las carga el postulante en su
 * perfil (BASICO / INTERMEDIO / AVANZADO) y se muestran como Avanzado / Medio /
 * Básico. Las fortalezas naturales del informe NO llevan nivel: el Eneagrama
 * mide preferencias, no habilidades demostradas.
 */

import type { NivelCompetencia as NivelTecnico } from '@/lib/constants/enums'
import { esFormatoAnterior, type InformePersonalidadJSON } from '@/lib/types/informe'

export const NIVELES_CERT = ['Avanzado', 'Medio', 'Básico'] as const
export type NivelCert = (typeof NIVELES_CERT)[number]

/** Nivel cargado por el postulante → etiqueta del certificado. */
export function nivelTecnicoACert(nivel: NivelTecnico | undefined): NivelCert {
  if (nivel === 'AVANZADO') return 'Avanzado'
  if (nivel === 'INTERMEDIO') return 'Medio'
  return 'Básico'
}

/**
 * Fortalezas naturales del informe (las 4 primeras del motor), en orden.
 * Los informes de formato anterior no las traen con esta forma: la sección no
 * se muestra hasta que se regeneren.
 */
export function fortalezasDelInforme(json: InformePersonalidadJSON | null | undefined): string[] {
  if (!json || esFormatoAnterior(json)) return []
  return json.fortalezas.map(f => f.competencia)
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
