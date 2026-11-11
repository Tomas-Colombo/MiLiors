import { describe, it, expect } from 'vitest'
import {
  evaluarRequisitosVisibilidad,
  MENSAJE_VISIBILIDAD_POSTULANTE,
} from './regla'

describe('evaluarRequisitosVisibilidad', () => {
  it('falla si no existe el perfil', () => {
    const res = evaluarRequisitosVisibilidad({
      existePerfil: false,
      tieneDominante: true,
      informeListo: true,
    })
    expect(res).toEqual({ ok: false, motivo: 'sin_perfil' })
  })

  it('falla si no tiene test con dominante', () => {
    const res = evaluarRequisitosVisibilidad({
      existePerfil: true,
      tieneDominante: false,
      informeListo: true,
    })
    expect(res).toEqual({ ok: false, motivo: 'sin_test' })
  })

  it('falla si el informe no está listo', () => {
    const res = evaluarRequisitosVisibilidad({
      existePerfil: true,
      tieneDominante: true,
      informeListo: false,
    })
    expect(res).toEqual({ ok: false, motivo: 'informe_pendiente' })
  })

  it('devuelve ok si cumple todas las condiciones', () => {
    const res = evaluarRequisitosVisibilidad({
      existePerfil: true,
      tieneDominante: true,
      informeListo: true,
    })
    expect(res).toEqual({ ok: true })
  })

  it('conserva los mensajes del postulante', () => {
    expect(MENSAJE_VISIBILIDAD_POSTULANTE).toEqual({
      sin_perfil: 'No se encontró el perfil del postulante.',
      sin_test: 'Debés completar el test de personalidad antes de hacer visible tu perfil.',
      informe_pendiente: 'Tu informe de personalidad debe estar listo antes de hacer visible tu perfil.',
    })
  })
})
