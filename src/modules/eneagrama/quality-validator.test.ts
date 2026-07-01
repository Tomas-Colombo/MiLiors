import { describe, it, expect } from 'vitest'
import { validarCalidadTest } from './quality-validator'
import type { NumeroEneatipo } from './calculator'

// ─── Helpers ────────────────────────────────────────────────────────────────

function repetido(valor: number, cantidad = 135): number[] {
  return Array(cantidad).fill(valor)
}

/** Respuestas cíclicas 1,2,3,4,5,1,2,3,4,5… → variación normal, 27 de cada valor. */
function respuestasNormales(cantidad = 135): number[] {
  return Array.from({ length: cantidad }, (_, i) => (i % 5) + 1)
}

function motivo(r: ReturnType<typeof validarCalidadTest>): string | undefined {
  return r.valido ? undefined : r.motivo
}

describe('validarCalidadTest', () => {
  describe('casos inválidos', () => {
    it('135 respuestas iguales en "5" (los 9 tipos empatan en 75) → inválido', () => {
      const valores = repetido(5)
      const dominantes = [1, 2, 3, 4, 5, 6, 7, 8, 9] as NumeroEneatipo[]
      const resultado = validarCalidadTest(valores, dominantes)
      expect(resultado.valido).toBe(false)
      // Las 3 reglas se disparan; se reporta la primera evaluada (tope de empate).
      expect(motivo(resultado)).toBe('tope_empate')
    })

    it('135 respuestas iguales en "1" → inválido', () => {
      const valores = repetido(1)
      const dominantes = [1, 2, 3, 4, 5, 6, 7, 8, 9] as NumeroEneatipo[]
      const resultado = validarCalidadTest(valores, dominantes)
      expect(resultado.valido).toBe(false)
    })

    it('~92% en una sola opción y el resto variado → inválido por concentración', () => {
      // 124/135 ≈ 91.85% en "3"
      const valores = [...repetido(3, 124), ...repetido(1, 11)]
      const dominantes = [3] as NumeroEneatipo[]
      const resultado = validarCalidadTest(valores, dominantes)
      expect(resultado.valido).toBe(false)
      expect(motivo(resultado)).toBe('concentracion')
    })

    it('empate de 4 tipos → inválido por tope de empate', () => {
      const valores = respuestasNormales()
      const dominantes = [1, 2, 3, 4] as NumeroEneatipo[]
      const resultado = validarCalidadTest(valores, dominantes)
      expect(resultado.valido).toBe(false)
      expect(motivo(resultado)).toBe('tope_empate')
    })

    it('desviación estándar apenas por debajo de 0.5 (con baja concentración) → inválido', () => {
      // 100 "3" + 35 "4" → std ≈ 0.438; concentración máxima 100/135 ≈ 74% (no dispara Regla B)
      const valores = [...repetido(3, 100), ...repetido(4, 35)]
      const dominantes = [3] as NumeroEneatipo[]
      const resultado = validarCalidadTest(valores, dominantes)
      expect(resultado.valido).toBe(false)
      expect(motivo(resultado)).toBe('baja_variacion')
    })
  })

  describe('casos válidos', () => {
    it('respuestas con variación normal y un solo dominante → válido', () => {
      const valores = respuestasNormales()
      const dominantes = [3] as NumeroEneatipo[]
      expect(validarCalidadTest(valores, dominantes).valido).toBe(true)
    })

    it('empate legítimo de 2 tipos → válido', () => {
      const valores = respuestasNormales()
      const dominantes = [1, 6] as NumeroEneatipo[]
      expect(validarCalidadTest(valores, dominantes).valido).toBe(true)
    })

    it('empate legítimo de 3 tipos → válido', () => {
      const valores = respuestasNormales()
      const dominantes = [2, 5, 8] as NumeroEneatipo[]
      expect(validarCalidadTest(valores, dominantes).valido).toBe(true)
    })

    it('desviación estándar apenas por encima de 0.5 → válido', () => {
      // 45 "2" + 45 "3" + 45 "4" → media 3, std ≈ 0.816
      const valores = [...repetido(2, 45), ...repetido(3, 45), ...repetido(4, 45)]
      const dominantes = [3] as NumeroEneatipo[]
      const resultado = validarCalidadTest(valores, dominantes)
      expect(resultado.valido).toBe(true)
    })
  })

  describe('caso límite de desviación estándar', () => {
    it('confirma el corte: 0.438 (< 0.5) inválido vs. 0.816 (> 0.5) válido', () => {
      const debajo = [...repetido(3, 100), ...repetido(4, 35)]
      const encima = [...repetido(2, 45), ...repetido(3, 45), ...repetido(4, 45)]
      const dominantes = [3] as NumeroEneatipo[]

      expect(validarCalidadTest(debajo, dominantes).valido).toBe(false)
      expect(validarCalidadTest(encima, dominantes).valido).toBe(true)
    })
  })
})
