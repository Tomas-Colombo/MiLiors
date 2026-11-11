import { describe, it, expect } from 'vitest'
import {
  evaluarCuotaInforme,
  LIMITE_INFORMES_HORA,
  LIMITE_INFORMES_DIA,
} from './cuota'

describe('seleccion/cuota — evaluarCuotaInforme (H-221)', () => {
  it('permite informes si los conteos están por debajo de los límites', () => {
    expect(evaluarCuotaInforme(0, 0)).toEqual({ permitida: true })
    expect(evaluarCuotaInforme(LIMITE_INFORMES_HORA - 1, LIMITE_INFORMES_DIA - 1)).toEqual({
      permitida: true,
    })
  })

  it('bloquea cuando se alcanza justo el límite por hora (5)', () => {
    const res = evaluarCuotaInforme(LIMITE_INFORMES_HORA, 10)
    expect(res).toEqual({
      permitida: false,
      error: `Alcanzaste el límite de informes de selección (${LIMITE_INFORMES_HORA} por hora). Probá de nuevo más tarde.`,
    })
  })

  it('bloquea cuando se alcanza justo el límite por día (20)', () => {
    const res = evaluarCuotaInforme(2, LIMITE_INFORMES_DIA)
    expect(res).toEqual({
      permitida: false,
      error: `Alcanzaste el límite de informes de selección (${LIMITE_INFORMES_DIA} por día). Probá de nuevo más tarde.`,
    })
  })
})
