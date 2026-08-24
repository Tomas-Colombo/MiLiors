import { describe, it, expect } from 'vitest'
import { evaluarRehacer } from './rehacer-policy'

const AHORA = new Date('2026-08-14T12:00:00Z')

describe('evaluarRehacer', () => {
  it('permite el test cuando nunca fue completado', () => {
    const r = evaluarRehacer(0, null, AHORA)
    expect(r.puedeRehacer).toBe(true)
    expect(r.primeraVez).toBe(true)
  })

  it('permite una repetición inmediata tras el primer resultado', () => {
    const r = evaluarRehacer(1, '2026-08-14T11:00:00Z', AHORA)
    expect(r.puedeRehacer).toBe(true)
    expect(r.esAjusteInicial).toBe(true)
  })

  it('bloquea antes de los 6 meses a partir de la segunda realización', () => {
    const r = evaluarRehacer(2, '2026-06-14T12:00:00Z', AHORA)
    expect(r.puedeRehacer).toBe(false)
    expect(r.disponibleDesde?.toISOString()).toBe('2026-12-14T12:00:00.000Z')
    expect(r.diasRestantes).toBeGreaterThan(0)
  })

  it('permite rehacer una vez cumplidos los 6 meses', () => {
    const r = evaluarRehacer(3, '2026-02-14T12:00:00Z', AHORA)
    expect(r.puedeRehacer).toBe(true)
    expect(r.disponibleDesde).toBeNull()
  })

  it('no bloquea si falta la fecha de realización', () => {
    expect(evaluarRehacer(2, null, AHORA).puedeRehacer).toBe(true)
  })
})
