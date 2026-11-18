import { describe, it, expect } from 'vitest'
import {
  sanitizarNext,
  sanitizarNextParaRol,
  tokenDeDestinoEmpleos,
  urlIniciarSesionConNext,
} from './sanitizar-next'

describe('sanitizarNext', () => {
  it('acepta rutas relativas de la allowlist', () => {
    expect(sanitizarNext('/empleos/abc123')).toBe('/empleos/abc123')
    expect(sanitizarNext('/postulante/puestos/uuid')).toBe('/postulante/puestos/uuid')
  })

  it('conserva la query y descarta el hash', () => {
    expect(sanitizarNext('/postulante/puestos/u?enlace=tok&from=postulaciones#x')).toBe(
      '/postulante/puestos/u?enlace=tok&from=postulaciones',
    )
  })

  it.each([
    ['https://evil.com'],
    ['//evil.com'],
    ['///evil.com'],
    ['/\\evil.com'],
    ['/empleos/\\evil.com'],
    ['javascript:alert(1)'],
    ['evil.com/empleos/x'],
    ['empleos/x'],
    ['/\t/evil.com'],
    ['/empleos/a\nb'],
    ['/empleos/a\u0000b'],
    ['/%2f/evil.com'],
    ['/empleos//evil.com'],
    ['/empleos/%2f%2fevil.com'],
    ['/empleos/%5cevil.com'],
    ['/empleos/%0aevil'],
    ['/empleos/../admin'],
    ['/empleos/%2e%2e/admin'],
    ['/empleos/..%2fadmin'],
    ['/empleos/%'],
  ])('rechaza %j', (valor) => {
    expect(sanitizarNext(valor)).toBeNull()
  })

  it('rechaza rutas fuera de la allowlist', () => {
    expect(sanitizarNext('/admin')).toBeNull()
    expect(sanitizarNext('/reclutador/puestos')).toBeNull()
    expect(sanitizarNext('/api/algo')).toBeNull()
    expect(sanitizarNext('/')).toBeNull()
    expect(sanitizarNext('/empleos')).toBeNull()
    expect(sanitizarNext('/empleos/')).toBeNull()
    expect(sanitizarNext('/postulante')).toBeNull()
    expect(sanitizarNext('/empleosx/abc')).toBeNull()
  })

  it('rechaza valores que no son string, vacíos o demasiado largos', () => {
    expect(sanitizarNext(null)).toBeNull()
    expect(sanitizarNext(undefined)).toBeNull()
    expect(sanitizarNext(['/empleos/a'])).toBeNull()
    expect(sanitizarNext('')).toBeNull()
    expect(sanitizarNext('/empleos/' + 'a'.repeat(600))).toBeNull()
  })
})

describe('sanitizarNextParaRol', () => {
  it('/empleos sirve a todos los roles', () => {
    for (const rol of ['POSTULANTE', 'RECLUTADOR', 'ADMIN'] as const) {
      expect(sanitizarNextParaRol('/empleos/tok', rol)).toBe('/empleos/tok')
    }
  })

  it('/postulante sólo sirve al POSTULANTE', () => {
    expect(sanitizarNextParaRol('/postulante/puestos/x', 'POSTULANTE')).toBe('/postulante/puestos/x')
    expect(sanitizarNextParaRol('/postulante/puestos/x', 'RECLUTADOR')).toBeNull()
    expect(sanitizarNextParaRol('/postulante/puestos/x', 'ADMIN')).toBeNull()
    expect(sanitizarNextParaRol('/postulante/puestos/x', null)).toBeNull()
  })

  it('un next inválido da null para cualquier rol', () => {
    expect(sanitizarNextParaRol('//evil.com', 'POSTULANTE')).toBeNull()
  })
})

describe('tokenDeDestinoEmpleos', () => {
  it('extrae el token de /empleos/{token}', () => {
    expect(tokenDeDestinoEmpleos('/empleos/abc_-123?x=1')).toBe('abc_-123')
  })
  it('devuelve null para otros destinos', () => {
    expect(tokenDeDestinoEmpleos('/postulante/puestos/x')).toBeNull()
  })
})

describe('urlIniciarSesionConNext', () => {
  it('codifica el destino', () => {
    expect(urlIniciarSesionConNext('/empleos/tok')).toBe('/iniciar-sesion?next=%2Fempleos%2Ftok')
  })
  it('sin destino devuelve el login pelado y mantiene los extras', () => {
    expect(urlIniciarSesionConNext(null)).toBe('/iniciar-sesion')
    expect(urlIniciarSesionConNext('/empleos/tok', { motivo: 'revocada' })).toBe(
      '/iniciar-sesion?motivo=revocada&next=%2Fempleos%2Ftok',
    )
  })
})
