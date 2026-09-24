/**
 * Tabla de pesos del motor v2 (eneatipo → competencia).
 *
 * Propuesta de la "Especificación del motor y del informe de talentos v2.0",
 * a calibrar por la clienta. Vive separada de la lógica para poder ajustarla
 * sin tocar el cálculo y, más adelante, leerla desde un panel de admin.
 *
 * Cada fila tiene los 9 eneatipos (índice 0 = tipo 1 … índice 8 = tipo 9) con
 * peso 1 a 3. Todos los tipos suman 22 y tienen exactamente 3 competencias con
 * peso 3, para que ninguno quede favorecido.
 */

import type { CompetenciaKey } from './competencias'

type PesosPorTipo = readonly [number, number, number, number, number, number, number, number, number]

export const PESOS_COMPETENCIAS: Record<CompetenciaKey, PesosPorTipo> = {
  //                       1  2  3  4  5  6  7  8  9
  liderazgo:              [2, 1, 3, 1, 1, 1, 1, 3, 1],
  autonomia:              [1, 1, 2, 2, 3, 1, 2, 3, 1],
  comercial:              [1, 3, 3, 1, 1, 1, 2, 2, 2],
  comunicacion:           [2, 2, 1, 3, 1, 1, 2, 2, 3],
  trabajo_equipo:         [1, 3, 2, 1, 1, 3, 1, 1, 2],
  mediacion:              [1, 3, 1, 2, 2, 2, 1, 1, 3],
  analitico:              [3, 1, 1, 1, 3, 2, 1, 1, 1],
  atencion_detalle:       [3, 1, 1, 2, 2, 3, 1, 1, 1],
  innovacion:             [1, 1, 1, 3, 3, 1, 3, 1, 1],
  storytelling:           [1, 2, 2, 3, 1, 1, 3, 1, 1],
  organizacion:           [3, 1, 1, 1, 2, 3, 1, 1, 2],
  adaptarse:              [1, 2, 1, 1, 1, 1, 3, 2, 3],
  orientacion_resultados: [2, 1, 3, 1, 1, 2, 1, 3, 1],
}

/** Primeras N del orden de la persona. */
export const CANTIDAD_FORTALEZAS = 4
/** Últimas N del orden de la persona. */
export const CANTIDAD_FOCOS = 2
