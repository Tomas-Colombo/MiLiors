import { describe, it, expect } from 'vitest'
import { evaluarCuota } from './cuota'

describe('lib/ai/cuota — evaluarCuota (H-221)', () => {
  const config = {
    limiteHora: 10,
    limiteDia: 50,
    etiqueta: 'operaciones de prueba',
  }

  it('permite operaciones cuando los conteos están por debajo de los límites', () => {
    expect(evaluarCuota(0, 0, config)).toEqual({ permitida: true })
    expect(evaluarCuota(9, 49, config)).toEqual({ permitida: true })
  })

  it('bloquea cuando se alcanza exactamente el límite por hora', () => {
    const res = evaluarCuota(10, 20, config)
    expect(res).toEqual({
      permitida: false,
      error: 'Alcanzaste el límite de operaciones de prueba (10 por hora). Probá de nuevo más tarde.',
    })
  })

  it('bloquea cuando se supera el límite por hora', () => {
    const res = evaluarCuota(15, 20, config)
    expect(res.permitida).toBe(false)
    if (!res.permitida) {
      expect(res.error).toBe(
        'Alcanzaste el límite de operaciones de prueba (10 por hora). Probá de nuevo más tarde.'
      )
    }
  })

  it('bloquea cuando se alcanza exactamente el límite por día', () => {
    const res = evaluarCuota(5, 50, config)
    expect(res).toEqual({
      permitida: false,
      error: 'Alcanzaste el límite de operaciones de prueba (50 por día). Probá de nuevo más tarde.',
    })
  })

  it('bloquea cuando se supera el límite por día', () => {
    const res = evaluarCuota(5, 55, config)
    expect(res.permitida).toBe(false)
    if (!res.permitida) {
      expect(res.error).toBe(
        'Alcanzaste el límite de operaciones de prueba (50 por día). Probá de nuevo más tarde.'
      )
    }
  })
})
