import { describe, it, expect } from 'vitest'
import { evaluarRequisitosVisibilidad } from './regla'

describe('evaluarRequisitosVisibilidad', () => {
  it('falla si no existe el perfil', () => {
    const res = evaluarRequisitosVisibilidad({
      existePerfil: false,
      tieneDominante: true,
      informeListo: true,
    })
    expect(res).toEqual({
      ok: false,
      error: 'No se encontró el perfil del postulante.',
    })
  })

  it('falla si no tiene test con dominante', () => {
    const res = evaluarRequisitosVisibilidad({
      existePerfil: true,
      tieneDominante: false,
      informeListo: true,
    })
    expect(res).toEqual({
      ok: false,
      error: 'Debés completar el test de personalidad antes de hacer visible tu perfil.',
    })
  })

  it('falla si el informe no está listo', () => {
    const res = evaluarRequisitosVisibilidad({
      existePerfil: true,
      tieneDominante: true,
      informeListo: false,
    })
    expect(res).toEqual({
      ok: false,
      error: 'Tu informe de personalidad debe estar listo antes de hacer visible tu perfil.',
    })
  })

  it('devuelve ok si cumple todas las condiciones', () => {
    const res = evaluarRequisitosVisibilidad({
      existePerfil: true,
      tieneDominante: true,
      informeListo: true,
    })
    expect(res).toEqual({ ok: true })
  })
})
