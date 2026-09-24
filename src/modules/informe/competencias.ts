/**
 * Motor de competencias — cálculo DETERMINÍSTICO, sin LLM.
 *
 * Entrada: los 9 scores del Eneagrama (porcentaje 0-100 por eneatipo, tal como
 * se guardan en `resultado_puntaje_eneagrama`).
 * Salida: mapa de personalidad (9), dominante/ala/secundario, puntos de
 * integración y estrés, y las 13 competencias ordenadas dentro de la persona,
 * con sus fortalezas y focos.
 *
 * La tabla de pesos vive en `pesos-competencias.ts` (la clienta la calibra).
 * No mover esta lógica al LLM.
 */

import type { BloqueCompetencia, MapaPersonalidadItem } from '@/lib/types/informe'
import { CANTIDAD_FOCOS, CANTIDAD_FORTALEZAS, PESOS_COMPETENCIAS } from './pesos-competencias'

// ── Eneatipos ────────────────────────────────────────────────────────────────

export const ENEATIPO_NOMBRES: Record<number, string> = {
  1: 'El Reformador',
  2: 'El Ayudador',
  3: 'El Triunfador',
  4: 'El Individualista',
  5: 'El Investigador',
  6: 'El Leal',
  7: 'El Entusiasta',
  8: 'El Desafiador',
  9: 'El Pacificador',
}

/**
 * Hacia dónde se mueve cada dominante (tabla fija del Eneagrama, especificación
 * v2.0). Integración: hacia dónde crece la persona cuando está bien. Estrés:
 * cómo reacciona bajo presión. Índice = eneatipo dominante.
 */
export const PUNTO_INTEGRACION: Record<number, number> = { 1: 7, 2: 4, 3: 6, 4: 1, 5: 8, 6: 9, 7: 5, 8: 2, 9: 3 }
export const PUNTO_ESTRES: Record<number, number> = { 1: 4, 2: 8, 3: 9, 4: 2, 5: 7, 6: 3, 7: 1, 8: 5, 9: 6 }

// ── Competencias ─────────────────────────────────────────────────────────────
// Los pesos por eneatipo están en PESOS_COMPETENCIAS (pesos-competencias.ts).

export type CompetenciaKey =
  | 'comercial'
  | 'comunicacion'
  | 'trabajo_equipo'
  | 'mediacion'
  | 'liderazgo'
  | 'autonomia'
  | 'innovacion'
  | 'storytelling'
  | 'analitico'
  | 'atencion_detalle'
  | 'organizacion'
  | 'adaptarse'
  | 'orientacion_resultados'

type CompetenciaDef = {
  key: CompetenciaKey
  nombre: string
  bloque: BloqueCompetencia
}

export const COMPETENCIAS: CompetenciaDef[] = [
  // Cómo decide y lidera
  { key: 'liderazgo', nombre: 'Liderazgo', bloque: 'Cómo decide y lidera' },
  { key: 'autonomia', nombre: 'Autonomía e iniciativa', bloque: 'Cómo decide y lidera' },
  // Cómo se relaciona
  { key: 'comercial', nombre: 'Comercial / ventas relacionales', bloque: 'Cómo se relaciona' },
  { key: 'comunicacion', nombre: 'Comunicación', bloque: 'Cómo se relaciona' },
  { key: 'trabajo_equipo', nombre: 'Trabajo en equipo', bloque: 'Cómo se relaciona' },
  { key: 'mediacion', nombre: 'Mediación y resolución de conflictos', bloque: 'Cómo se relaciona' },
  // Cómo piensa y resuelve
  { key: 'analitico', nombre: 'Analítico / numérico', bloque: 'Cómo piensa y resuelve' },
  { key: 'atencion_detalle', nombre: 'Atención al detalle', bloque: 'Cómo piensa y resuelve' },
  { key: 'innovacion', nombre: 'Innovación y creatividad', bloque: 'Cómo piensa y resuelve' },
  { key: 'storytelling', nombre: 'Storytelling y expresión de marca', bloque: 'Cómo piensa y resuelve' },
  // Cómo ejecuta y se sostiene
  { key: 'organizacion', nombre: 'Organización y planificación', bloque: 'Cómo ejecuta y se sostiene' },
  { key: 'adaptarse', nombre: 'Adaptarse y afrontar', bloque: 'Cómo ejecuta y se sostiene' },
  { key: 'orientacion_resultados', nombre: 'Orientación a resultados', bloque: 'Cómo ejecuta y se sostiene' },
]

// ── Textos de marco ──────────────────────────────────────────────────────────

/** Leyenda al pie del informe (especificación v2.0). Pantalla y PDF la comparten. */
export const LEYENDA_INFORME =
  'Este informe describe preferencias y estilos naturales de trabajo a partir del Eneagrama. ' +
  'No mide conocimientos ni habilidades adquiridas, no es una evaluación clínica y no reemplaza ' +
  'la entrevista ni la verificación de experiencia. Se recomienda usarlo como guía para conversar, ' +
  'entrevistar y acompañar el desarrollo de la persona.'

// ── Motor v2 ─────────────────────────────────────────────────────────────────
// Especificación v2.0: cada competencia es el promedio ponderado de los 9
// eneatipos según PESOS_COMPETENCIAS. Sin contraste, sin Human Design, sin
// niveles ni barras: el informe muestra un ranking (fortalezas y focos).
//
// NO se redondea en ningún paso del cálculo. Redondear inventa empates (47,21 y
// 46,6 pasarían a 47 y 47) y altera el ranking; el redondeo es solo de display.

/**
 * Tolerancia para comparar scores en punto flotante. Hay empates reales que la
 * aritmética puede dejar a un ulp de distancia (ej 731/17 y 645/15 valen 43).
 */
const EPSILON_SCORE = 1e-9

function mismoScore(a: number, b: number): boolean {
  return Math.abs(a - b) < EPSILON_SCORE
}

export type EneatipoReferencia = { numero: number; nombre: string }

export type CompetenciaRanking = {
  key: CompetenciaKey
  nombre: string
  bloque: BloqueCompetencia
  /** Promedio ponderado 0-100 SIN redondear. */
  score: number
}

export type MotorV2Resultado = {
  mapaPersonalidad: MapaPersonalidadItem[]
  dominante: EneatipoReferencia
  ala: EneatipoReferencia
  secundario: EneatipoReferencia
  integracion: EneatipoReferencia
  estres: EneatipoReferencia
  /** Las 13 competencias de mayor a menor score. */
  ordenCompleto: CompetenciaRanking[]
  fortalezas: CompetenciaRanking[]
  focosDesarrollo: CompetenciaRanking[]
}

function referenciaEneatipo(numero: number): EneatipoReferencia {
  return { numero, nombre: ENEATIPO_NOMBRES[numero] }
}

/**
 * Eneatipo de mayor score entre los candidatos. Empate → el de número menor
 * (los candidatos se recorren en orden ascendente).
 */
function mayorEneatipo(candidatos: number[], puntaje: (t: number) => number): number {
  const ordenados = [...candidatos].sort((a, b) => a - b)
  let mejor = ordenados[0]
  for (const t of ordenados.slice(1)) {
    if (!mismoScore(puntaje(t), puntaje(mejor)) && puntaje(t) > puntaje(mejor)) mejor = t
  }
  return mejor
}

/** Vecinos circulares en el eneagrama: el 1 limita con 9 y 2; el 9, con 8 y 1. */
function vecinosEneatipo(numero: number): [number, number] {
  return [numero === 1 ? 9 : numero - 1, numero === 9 ? 1 : numero + 1]
}

/**
 * Calcula el ranking de competencias según la especificación v2.0.
 * @param scores  Record eneatipo(1-9) → porcentaje 0-100 (faltante = 0).
 */
export function calcularMotorV2(scores: Record<number, number>): MotorV2Resultado {
  const puntaje = (t: number) => Math.max(0, Math.min(100, scores[t] ?? 0))
  const eneatipos = [1, 2, 3, 4, 5, 6, 7, 8, 9]

  // Mapa de personalidad: el score se redondea solo para mostrarlo.
  const mapaPersonalidad: MapaPersonalidadItem[] = eneatipos.map(numero => ({
    eneatipo: numero,
    nombre: ENEATIPO_NOMBRES[numero],
    score: Math.round(puntaje(numero)),
  }))

  const dominante = mayorEneatipo(eneatipos, puntaje)
  // El ala sale siempre de los dos vecinos del dominante; el secundario, del
  // resto de los eneatipos. Pueden coincidir.
  const ala = mayorEneatipo(vecinosEneatipo(dominante), puntaje)
  const secundario = mayorEneatipo(eneatipos.filter(t => t !== dominante), puntaje)

  const calculadas = COMPETENCIAS.map((def, posicionTabla) => {
    const pesosDef = PESOS_COMPETENCIAS[def.key]
    const sumaPesos = pesosDef.reduce((a, b) => a + b, 0)
    const ponderado = pesosDef.reduce((acc, peso, i) => acc + peso * puntaje(i + 1), 0)
    return {
      item: { key: def.key, nombre: def.nombre, bloque: def.bloque, score: ponderado / sumaPesos },
      pesoDominante: pesosDef[dominante - 1],
      posicionTabla,
    }
  })

  // Orden: score desc; empate → mayor peso para el eneatipo dominante; si sigue
  // el empate → orden de la tabla COMPETENCIAS.
  calculadas.sort((a, b) => {
    if (!mismoScore(a.item.score, b.item.score)) return b.item.score - a.item.score
    if (a.pesoDominante !== b.pesoDominante) return b.pesoDominante - a.pesoDominante
    return a.posicionTabla - b.posicionTabla
  })
  const ordenCompleto = calculadas.map(c => c.item)

  return {
    mapaPersonalidad,
    dominante: referenciaEneatipo(dominante),
    ala: referenciaEneatipo(ala),
    secundario: referenciaEneatipo(secundario),
    integracion: referenciaEneatipo(PUNTO_INTEGRACION[dominante]),
    estres: referenciaEneatipo(PUNTO_ESTRES[dominante]),
    ordenCompleto,
    fortalezas: ordenCompleto.slice(0, CANTIDAD_FORTALEZAS),
    focosDesarrollo: ordenCompleto.slice(-CANTIDAD_FOCOS),
  }
}
