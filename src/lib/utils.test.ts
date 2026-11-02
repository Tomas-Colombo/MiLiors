import { describe, it, expect } from 'vitest'
import { isUuid, cn } from './utils'

describe('isUuid', () => {
  it('valida un UUID válido en minúsculas', () => {
    expect(isUuid('c7b3d8e0-5e0b-4b8f-8e1e-2b0e4b8f0e1e')).toBe(true)
  })

  it('valida un UUID válido en mayúsculas', () => {
    expect(isUuid('C7B3D8E0-5E0B-4B8F-8E1E-2B0E4B8F0E1E')).toBe(true)
  })

  it('rechaza la sentinela "OTRAS"', () => {
    expect(isUuid('OTRAS')).toBe(false)
  })

  it('rechaza una cadena vacía', () => {
    expect(isUuid('')).toBe(false)
  })

  it('rechaza un UUID con un carácter de más', () => {
    expect(isUuid('c7b3d8e0-5e0b-4b8f-8e1e-2b0e4b8f0e1ea')).toBe(false)
  })

  it('rechaza cadenas que no son UUID', () => {
    expect(isUuid('no-es-uuid')).toBe(false)
    expect(isUuid('12345')).toBe(false)
  })
})

describe('cn', () => {
  it('une clases ignorando valores falsy', () => {
    expect(cn('btn', false, null, undefined, 'btn-primary')).toBe('btn btn-primary')
  })
})
