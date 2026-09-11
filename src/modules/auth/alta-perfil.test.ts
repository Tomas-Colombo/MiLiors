import { describe, it, expect } from 'vitest'
import { resultadoAltaPerfil } from './alta-perfil'

describe('resultadoAltaPerfil', () => {
  it('da el perfil por creado cuando el insert no falló', () => {
    expect(resultadoAltaPerfil(null)).toBe('creado')
  })

  it('reconoce el perfil ya existente de una cuenta sin confirmar', () => {
    expect(resultadoAltaPerfil({ code: '23505' })).toBe('ya-existia')
  })

  it('trata cualquier otro error como una falla real', () => {
    expect(resultadoAltaPerfil({ code: '23503' })).toBe('fallo')
  })
})
