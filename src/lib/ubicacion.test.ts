import { describe, it, expect } from 'vitest'
import { ubicacionLabel } from './ubicacion'

describe('ubicacionLabel', () => {
  it('usa la localidad cuando está cargada', () => {
    expect(
      ubicacionLabel({
        nombre_localidad: 'Godoy Cruz',
        nombre_departamento: 'Godoy Cruz',
        nombre_provincia: 'Mendoza',
      }),
    ).toBe('Godoy Cruz, Mendoza')
  })

  it('cae al departamento cuando no hay localidad', () => {
    expect(
      ubicacionLabel({
        nombre_localidad: null,
        nombre_departamento: 'Las Heras',
        nombre_provincia: 'Mendoza',
      }),
    ).toBe('Las Heras, Mendoza')
  })

  it('prioriza la localidad sobre el departamento cuando difieren', () => {
    expect(
      ubicacionLabel({
        nombre_localidad: 'El Challao',
        nombre_departamento: 'Las Heras',
        nombre_provincia: 'Mendoza',
      }),
    ).toBe('El Challao, Mendoza')
  })

  it('devuelve sólo la provincia si es el único nivel cargado', () => {
    expect(
      ubicacionLabel({
        nombre_localidad: null,
        nombre_departamento: null,
        nombre_provincia: 'Mendoza',
      }),
    ).toBe('Mendoza')
  })

  it('devuelve cadena vacía sin ningún nivel (ej.: puesto remoto)', () => {
    expect(
      ubicacionLabel({
        nombre_localidad: null,
        nombre_departamento: null,
        nombre_provincia: null,
      }),
    ).toBe('')
  })

  it('trata los campos ausentes igual que los nulos', () => {
    expect(ubicacionLabel({})).toBe('')
    expect(ubicacionLabel({ nombre_provincia: 'San Juan' })).toBe('San Juan')
  })

  it('ignora las cadenas vacías en lugar de dejar comas sueltas', () => {
    expect(
      ubicacionLabel({
        nombre_localidad: '',
        nombre_departamento: 'Capital',
        nombre_provincia: 'San Juan',
      }),
    ).toBe('Capital, San Juan')
  })
})
