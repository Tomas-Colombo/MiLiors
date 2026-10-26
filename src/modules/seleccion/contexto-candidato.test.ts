import { describe, it, expect } from 'vitest'
import { filtrarNotasDelPuesto } from './contexto-candidato'

describe('filtrarNotasDelPuesto', () => {
  const notas = [
    { contenido: 'De este puesto', puesto_id: 'p1' },
    { contenido: 'De otro puesto', puesto_id: 'p2' },
    { contenido: 'General', puesto_id: null },
  ]

  it('deja las notas del puesto y las generales, en el mismo orden', () => {
    expect(filtrarNotasDelPuesto(notas, 'p1')).toEqual(['De este puesto', 'General'])
  })

  it('deja afuera las notas de otros puestos', () => {
    expect(filtrarNotasDelPuesto(notas, 'p3')).toEqual(['General'])
  })

  it('manda como máximo 10 notas', () => {
    const muchas = Array.from({ length: 15 }, (_, i) => ({ contenido: `n${i}`, puesto_id: null }))
    expect(filtrarNotasDelPuesto(muchas, 'p1')).toHaveLength(10)
  })
})
