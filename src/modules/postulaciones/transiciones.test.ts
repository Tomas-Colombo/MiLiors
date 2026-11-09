import { describe, it, expect } from 'vitest'
import { ESTADO_POSTULACION } from '@/lib/constants/enums'
import {
  ORIGENES_VALIDOS_VISTO,
  ORIGENES_VALIDOS_NO_AVANZAR,
  ORIGENES_VALIDOS_REVERTIR_DESCARTE,
  ORIGENES_VALIDOS_MARCAR,
  esOrigenValidoVisto,
  esOrigenValidoNoAvanzar,
  esOrigenValidoRevertirDescarte,
  esOrigenValidoMarcar,
} from './transiciones'

describe('transiciones de postulaciones', () => {
  it('pasar a VISTO solo permite origen ENVIADA', () => {
    expect(ORIGENES_VALIDOS_VISTO).toEqual([ESTADO_POSTULACION.ENVIADA])
    expect(esOrigenValidoVisto(ESTADO_POSTULACION.ENVIADA)).toBe(true)
    expect(esOrigenValidoVisto(ESTADO_POSTULACION.VISTO)).toBe(false)
    expect(esOrigenValidoVisto(ESTADO_POSTULACION.PROCESO_FINALIZADO)).toBe(false)
    expect(esOrigenValidoVisto(ESTADO_POSTULACION.CERRADA)).toBe(false)
  })

  it('no avanzar permite origen ENVIADA o VISTO', () => {
    expect(ORIGENES_VALIDOS_NO_AVANZAR).toEqual([
      ESTADO_POSTULACION.ENVIADA,
      ESTADO_POSTULACION.VISTO,
    ])
    expect(esOrigenValidoNoAvanzar(ESTADO_POSTULACION.ENVIADA)).toBe(true)
    expect(esOrigenValidoNoAvanzar(ESTADO_POSTULACION.VISTO)).toBe(true)
    expect(esOrigenValidoNoAvanzar(ESTADO_POSTULACION.PROCESO_FINALIZADO)).toBe(false)
    expect(esOrigenValidoNoAvanzar(ESTADO_POSTULACION.CERRADA)).toBe(false)
  })

  it('revertir descarte solo permite origen PROCESO_FINALIZADO', () => {
    expect(ORIGENES_VALIDOS_REVERTIR_DESCARTE).toEqual([
      ESTADO_POSTULACION.PROCESO_FINALIZADO,
    ])
    expect(esOrigenValidoRevertirDescarte(ESTADO_POSTULACION.PROCESO_FINALIZADO)).toBe(true)
    expect(esOrigenValidoRevertirDescarte(ESTADO_POSTULACION.ENVIADA)).toBe(false)
    expect(esOrigenValidoRevertirDescarte(ESTADO_POSTULACION.VISTO)).toBe(false)
    expect(esOrigenValidoRevertirDescarte(ESTADO_POSTULACION.CERRADA)).toBe(false)
  })

  it('marcar permite ENVIADA, VISTO o PROCESO_FINALIZADO pero no CERRADA', () => {
    expect(ORIGENES_VALIDOS_MARCAR).toEqual([
      ESTADO_POSTULACION.ENVIADA,
      ESTADO_POSTULACION.VISTO,
      ESTADO_POSTULACION.PROCESO_FINALIZADO,
    ])
    expect(esOrigenValidoMarcar(ESTADO_POSTULACION.ENVIADA)).toBe(true)
    expect(esOrigenValidoMarcar(ESTADO_POSTULACION.VISTO)).toBe(true)
    expect(esOrigenValidoMarcar(ESTADO_POSTULACION.PROCESO_FINALIZADO)).toBe(true)
    expect(esOrigenValidoMarcar(ESTADO_POSTULACION.CERRADA)).toBe(false)
  })
})
