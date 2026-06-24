import { describe, it, expect } from 'vitest'
import {
  calcularResultadoEneagrama,
  ErrorRespuestasIncompletas,
  type RespuestaInput,
  type NumeroEneatipo,
} from './calculator'

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Genera 15 respuestas para un eneatipo cuya suma sea `total`.
 * El total debe estar en rango [15, 75].
 * Estrategia: parte de 15 respuestas con valor 1, luego distribuye el
 * excedente sumando 1 a cada respuesta hasta completar.
 */
function respuestasPorTipo(
  eneatipo: NumeroEneatipo,
  total: number,
  offset = 0
): RespuestaInput[] {
  if (total < 15 || total > 75) {
    throw new Error(`Total ${total} fuera de rango para eneatipo ${eneatipo}`)
  }
  const valores = Array(15).fill(1) as number[]
  let resto = total - 15
  for (let i = 0; i < 15 && resto > 0; i++) {
    const incremento = Math.min(4, resto)
    valores[i] += incremento
    resto -= incremento
  }
  return valores.map((v, i) => ({
    preguntaId: `p${eneatipo}_${i + 1 + offset}`,
    eneatipoAsociado: eneatipo,
    valorRespondido: v as 1 | 2 | 3 | 4 | 5,
  }))
}

/** Construye las 135 respuestas completas a partir de un mapa tipo→puntaje. */
function armarRespuestas(puntajes: Record<NumeroEneatipo, number>): RespuestaInput[] {
  return ([1, 2, 3, 4, 5, 6, 7, 8, 9] as NumeroEneatipo[]).flatMap((t, idx) =>
    respuestasPorTipo(t, puntajes[t], idx * 15)
  )
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('calcularResultadoEneagrama', () => {
  // Caso real dado en la especificación: Uno y Seis empatan en 54
  const PUNTAJES_REALES: Record<NumeroEneatipo, number> = {
    1: 54, 2: 42, 3: 50, 4: 41, 5: 49,
    6: 54, 7: 48, 8: 51, 9: 49,
  }

  describe('caso normal (sin empates)', () => {
    it('devuelve el dominante correcto cuando un solo tipo tiene el mayor puntaje', () => {
      const puntajes: Record<NumeroEneatipo, number> = {
        1: 50, 2: 42, 3: 50, 4: 41, 5: 49,
        6: 53, 7: 48, 8: 51, 9: 49,
      }
      const respuestas = armarRespuestas(puntajes)
      const resultado = calcularResultadoEneagrama(respuestas)

      expect(resultado.dominantes).toEqual([6])
      expect(resultado.tieneEmpateDominante).toBe(false)
    })

    it('calcula los 9 puntajes crudos correctamente', () => {
      const puntajes: Record<NumeroEneatipo, number> = {
        1: 60, 2: 42, 3: 50, 4: 41, 5: 49,
        6: 53, 7: 48, 8: 51, 9: 49,
      }
      const respuestas = armarRespuestas(puntajes)
      const resultado = calcularResultadoEneagrama(respuestas)

      for (const t of [1, 2, 3, 4, 5, 6, 7, 8, 9] as NumeroEneatipo[]) {
        const p = resultado.puntajes.find(x => x.eneatipo === t)!
        expect(p.puntajeCrudo).toBe(puntajes[t])
      }
    })

    it('calcula el porcentaje del tipo dominante (15 preguntas, rango 15–75)', () => {
      // Tipo 9, puntaje 60: ((60-15)/(75-15))*100 = 75.0
      const puntajes: Record<NumeroEneatipo, number> = {
        1: 40, 2: 42, 3: 50, 4: 41, 5: 49,
        6: 53, 7: 48, 8: 51, 9: 60,
      }
      const resultado = calcularResultadoEneagrama(armarRespuestas(puntajes))
      const p9 = resultado.puntajes.find(x => x.eneatipo === 9)!
      expect(p9.porcentaje).toBe(75.0)
    })

    it('calcula el ala correctamente (vecino con mayor puntaje)', () => {
      // Dominante: 9 (60). Vecinos: 8 (51) y 1 (40). Ala → 8
      const puntajes: Record<NumeroEneatipo, number> = {
        1: 40, 2: 42, 3: 50, 4: 41, 5: 49,
        6: 53, 7: 48, 8: 51, 9: 60,
      }
      const resultado = calcularResultadoEneagrama(armarRespuestas(puntajes))
      expect(resultado.ala).toBe(8)
      expect(resultado.notacion).toBe('9w8')
      expect(resultado.tieneEmpateAla).toBe(false)
    })

    it('el ranking está ordenado de mayor a menor puntaje', () => {
      const respuestas = armarRespuestas(PUNTAJES_REALES)
      const resultado = calcularResultadoEneagrama(respuestas)

      for (let i = 0; i < resultado.ranking.length - 1; i++) {
        expect(resultado.ranking[i].puntajeCrudo).toBeGreaterThanOrEqual(
          resultado.ranking[i + 1].puntajeCrudo
        )
      }
    })

    it('devuelve siempre los 9 puntajes (vector completo para LLM)', () => {
      const resultado = calcularResultadoEneagrama(armarRespuestas(PUNTAJES_REALES))
      expect(resultado.puntajes).toHaveLength(9)
      expect(resultado.ranking).toHaveLength(9)
    })
  })

  describe('empate de dominante', () => {
    it('detecta empate y devuelve ambos dominantes', () => {
      const respuestas = armarRespuestas(PUNTAJES_REALES)
      const resultado = calcularResultadoEneagrama(respuestas)

      expect(resultado.tieneEmpateDominante).toBe(true)
      expect(resultado.dominantes).toEqual(expect.arrayContaining([1, 6]))
      expect(resultado.dominantes).toHaveLength(2)
    })

    it('no calcula ala cuando hay empate de dominante', () => {
      const resultado = calcularResultadoEneagrama(armarRespuestas(PUNTAJES_REALES))
      expect(resultado.ala).toBeNull()
    })

    it('genera notación de empate', () => {
      const resultado = calcularResultadoEneagrama(armarRespuestas(PUNTAJES_REALES))
      expect(resultado.notacion).toBe('1/6 (empate)')
    })
  })

  describe('empate de ala', () => {
    it('detecta empate de ala cuando los dos vecinos del dominante tienen el mismo puntaje', () => {
      // Dominante: 5 (75). Vecinos: 4 y 6 con igual puntaje (50).
      const puntajes: Record<NumeroEneatipo, number> = {
        1: 40, 2: 42, 3: 45, 4: 50, 5: 75,
        6: 50, 7: 48, 8: 44, 9: 43,
      }
      const resultado = calcularResultadoEneagrama(armarRespuestas(puntajes))

      expect(resultado.tieneEmpateDominante).toBe(false)
      expect(resultado.dominantes).toEqual([5])
      expect(resultado.tieneEmpateAla).toBe(true)
      // Vecinos del 5 son 4 y 6; con empate se reporta el menor (4)
      expect(resultado.ala).toBe(4)
    })
  })

  describe('respuestas incompletas', () => {
    it('lanza ErrorRespuestasIncompletas cuando faltan preguntas esperadas', () => {
      const respuestas = armarRespuestas(PUNTAJES_REALES)
      const incompletas = respuestas.slice(3)
      const esperadas = new Set(respuestas.map(r => r.preguntaId))

      expect(() =>
        calcularResultadoEneagrama(incompletas, esperadas)
      ).toThrowError(ErrorRespuestasIncompletas)
    })

    it('el error lista exactamente los IDs faltantes', () => {
      const respuestas = armarRespuestas(PUNTAJES_REALES)
      const faltantesEsperados = [respuestas[0].preguntaId, respuestas[5].preguntaId]
      const incompletas = respuestas.filter(
        r => !faltantesEsperados.includes(r.preguntaId)
      )
      const esperadas = new Set(respuestas.map(r => r.preguntaId))

      try {
        calcularResultadoEneagrama(incompletas, esperadas)
        expect.fail('Debería haber lanzado error')
      } catch (e) {
        expect(e).toBeInstanceOf(ErrorRespuestasIncompletas)
        const err = e as ErrorRespuestasIncompletas
        expect(err.faltantes).toHaveLength(2)
        expect(err.faltantes).toEqual(expect.arrayContaining(faltantesEsperados))
      }
    })

    it('no lanza error si preguntasEsperadasIds no se pasa', () => {
      const respuestas = armarRespuestas(PUNTAJES_REALES).slice(10)
      expect(() => calcularResultadoEneagrama(respuestas)).not.toThrow()
    })
  })
})
