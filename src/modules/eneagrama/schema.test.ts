import { describe, it, expect } from 'vitest'
import { edadCumplida, onboardingPostulanteSchema } from './schema'

const hoy = new Date(2026, 8, 24) // 24/09/2026

describe('edadCumplida', () => {
  it('cumple años el mismo día, no el siguiente', () => {
    expect(edadCumplida('2010-09-24', hoy)).toBe(16)
    expect(edadCumplida('2010-09-25', hoy)).toBe(15)
    expect(edadCumplida('2010-10-01', hoy)).toBe(15)
  })
})

describe('onboardingPostulanteSchema — fecha de nacimiento', () => {
  const base = {
    nombre_completo: 'Ana Pérez',
    provincia_id: '00000000-0000-4000-8000-000000000000',
    carrera_otra: 'Administración',
  }
  const error = (fecha_nacimiento: string) =>
    onboardingPostulanteSchema.safeParse({ ...base, fecha_nacimiento }).error?.flatten().fieldErrors.fecha_nacimiento

  it('es obligatoria', () => {
    expect(error('')).toBeDefined()
  })

  it('rechaza menores de 16 y acepta una fecha válida', () => {
    const haceQuinceAnios = `${new Date().getFullYear() - 15}-01-01`
    expect(error(haceQuinceAnios)).toBeDefined()
    expect(error('1990-05-01')).toBeUndefined()
  })
})
