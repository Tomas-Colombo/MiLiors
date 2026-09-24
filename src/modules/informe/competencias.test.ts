import { describe, it, expect } from 'vitest'
import {
  calcularMotorV2,
  COMPETENCIAS,
} from './competencias'
import { PESOS_COMPETENCIAS } from './pesos-competencias'

/** Helper: arma los 9 scores con default 0 y overrides. */
function scores(overrides: Record<number, number> = {}): Record<number, number> {
  const base: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 }
  return { ...base, ...overrides }
}

describe('COMPETENCIAS (tabla)', () => {
  it('define exactamente 13 competencias con keys únicas', () => {
    expect(COMPETENCIAS).toHaveLength(13)
    const keys = new Set(COMPETENCIAS.map(c => c.key))
    expect(keys.size).toBe(13)
  })
})

describe('PESOS_COMPETENCIAS (tabla v2)', () => {
  it('cada eneatipo suma 22 y tiene exactamente 3 competencias con peso 3', () => {
    const filas = Object.values(PESOS_COMPETENCIAS)
    expect(filas).toHaveLength(13)
    for (let i = 0; i < 9; i++) {
      expect(filas.reduce((acc, fila) => acc + fila[i], 0)).toBe(22)
      expect(filas.filter(fila => fila[i] === 3)).toHaveLength(3)
    }
  })
})

describe('calcularMotorV2', () => {
  const JANET = { 1: 70, 2: 20, 3: 47, 4: 27, 5: 37, 6: 38, 7: 62, 8: 52, 9: 40 }
  const JESICA = { 1: 48, 2: 95, 3: 43, 4: 28, 5: 18, 6: 52, 7: 80, 8: 42, 9: 28 }

  it('Janet: dominante 1, ala 9, secundario 7', () => {
    const r = calcularMotorV2(JANET)
    expect(r.dominante).toEqual({ numero: 1, nombre: 'El Reformador' })
    expect(r.ala.numero).toBe(9)
    expect(r.secundario.numero).toBe(7)
  })

  it('Janet: ranking completo con los valores sin redondear', () => {
    const r = calcularMotorV2(JANET)
    const esperado: [string, number][] = [
      ['liderazgo', 661 / 14],
      ['orientacion_resultados', 46.6],
      ['analitico', 645 / 14],
      ['organizacion', 686 / 15],
      ['atencion_detalle', 673 / 15],
      ['adaptarse', 44.6],
      ['autonomia', 44.1875],
      ['comunicacion', 43],
      ['innovacion', 43],
      ['comercial', 42.5625],
      ['storytelling', 638 / 15],
      ['trabajo_equipo', 596 / 15],
      ['mediacion', 38.4375],
    ]
    expect(r.ordenCompleto.map(c => c.key)).toEqual(esperado.map(([key]) => key))
    r.ordenCompleto.forEach((c, i) => expect(c.score).toBeCloseTo(esperado[i][1], 9))
  })

  it('Janet: 4 fortalezas y 2 focos en orden de ranking', () => {
    const r = calcularMotorV2(JANET)
    expect(r.fortalezas.map(c => c.nombre)).toEqual([
      'Liderazgo',
      'Orientación a resultados',
      'Analítico / numérico',
      'Organización y planificación',
    ])
    expect(r.focosDesarrollo.map(c => c.nombre)).toEqual([
      'Trabajo en equipo',
      'Mediación y resolución de conflictos',
    ])
    expect(r.fortalezas[0]).toEqual({
      key: 'liderazgo',
      nombre: 'Liderazgo',
      bloque: 'Cómo decide y lidera',
      score: expect.any(Number),
    })
  })

  it('empate real (43 = 43) se resuelve por el peso del dominante', () => {
    // Comunicación = 731/17 e Innovación = 645/15, ambas exactamente 43. El
    // dominante es 1: pesa 2 en Comunicación y 1 en Innovación.
    const r = calcularMotorV2(JANET)
    const keys = r.ordenCompleto.map(c => c.key)
    expect(keys.indexOf('comunicacion')).toBeLessThan(keys.indexOf('innovacion'))
  })

  it('no redondea: Liderazgo (47,21) queda estrictamente por encima de Resultados (46,6)', () => {
    // Redondeando, ambas darían 47: un empate que no existe en los datos.
    const r = calcularMotorV2(JANET)
    const lid = r.ordenCompleto.find(c => c.key === 'liderazgo')!
    const res = r.ordenCompleto.find(c => c.key === 'orientacion_resultados')!
    expect(lid.score).toBeGreaterThan(res.score)
    expect(r.ordenCompleto[0].key).toBe('liderazgo')
    expect(r.ordenCompleto[1].key).toBe('orientacion_resultados')
  })

  it('Jesica: dominante 2, ala 1, secundario 7 y su ranking', () => {
    const r = calcularMotorV2(JESICA)
    expect(r.dominante.numero).toBe(2)
    expect(r.ala.numero).toBe(1)
    expect(r.secundario.numero).toBe(7)
    expect(r.fortalezas.map(c => c.nombre)).toEqual([
      'Comercial / ventas relacionales',
      'Trabajo en equipo',
      'Storytelling y expresión de marca',
      'Adaptarse y afrontar',
    ])
    expect(r.focosDesarrollo.map(c => c.nombre)).toEqual([
      'Analítico / numérico',
      'Autonomía e iniciativa',
    ])
  })

  it('control por tipo único: las 3 primeras son las competencias con peso 3 para ese tipo', () => {
    for (let t = 1; t <= 9; t++) {
      const r = calcularMotorV2(scores({ [t]: 100 }))
      const conPesoTres = Object.entries(PESOS_COMPETENCIAS)
        .filter(([, fila]) => fila[t - 1] === 3)
        .map(([key]) => key)
      expect(new Set(r.ordenCompleto.slice(0, 3).map(c => c.key))).toEqual(new Set(conPesoTres))
    }
  })

  it('todos los scores iguales: desempata por número menor y por peso del tipo 1', () => {
    const r = calcularMotorV2(scores({ 1: 50, 2: 50, 3: 50, 4: 50, 5: 50, 6: 50, 7: 50, 8: 50, 9: 50 }))
    expect(r.dominante.numero).toBe(1)
    // Vecinos del 1: 9 y 2 empatados → el menor.
    expect(r.ala.numero).toBe(2)
    expect(r.secundario.numero).toBe(2)
    expect(r.ordenCompleto.every(c => c.score === 50)).toBe(true)
    // Todas empatan: peso del tipo 1 desc y, dentro de cada peso, orden de la tabla.
    const esperado = COMPETENCIAS
      .map((c, i) => ({ key: c.key, peso: PESOS_COMPETENCIAS[c.key][0], i }))
      .sort((a, b) => b.peso - a.peso || a.i - b.i)
      .map(c => c.key)
    expect(r.ordenCompleto.map(c => c.key)).toEqual(esperado)
  })

  it('el ala da la vuelta al círculo (9 ↔ 1)', () => {
    expect(calcularMotorV2(scores({ 9: 90, 1: 60, 8: 40 })).ala.numero).toBe(1)
    expect(calcularMotorV2(scores({ 1: 90, 9: 60, 2: 40 })).ala.numero).toBe(9)
  })
})
