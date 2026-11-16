import { describe, it, expect } from 'vitest'
import { clavesDescartadas, filtrarSinVaciar, type SintesisDescarte } from './certificado'

const descarte = (tipo: SintesisDescarte['tipo'], clave: string): SintesisDescarte => ({
  tipo,
  clave,
  label: clave,
  motivo: 'no relevante',
})

describe('filtrarSinVaciar', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

  it('aplica los descartes cuando queda al menos un ítem', () => {
    const claves = clavesDescartadas([descarte('formacion', 'b')], 'formacion')
    expect(filtrarSinVaciar(items, claves, i => i.id)).toEqual([{ id: 'a' }, { id: 'c' }])
  })

  it('devuelve todos los ítems si el triage los descartó a todos', () => {
    const claves = clavesDescartadas(items.map(i => descarte('formacion', i.id)), 'formacion')
    expect(filtrarSinVaciar(items, claves, i => i.id)).toEqual(items)
  })

  it('restaura la única formación descartada', () => {
    const unica = [{ id: 'tecnico' }]
    const claves = clavesDescartadas([descarte('formacion', 'tecnico')], 'formacion')
    expect(filtrarSinVaciar(unica, claves, i => i.id)).toEqual(unica)
  })

  it('sin ítems cargados sigue devolviendo vacío', () => {
    const claves = clavesDescartadas([descarte('formacion', 'x')], 'formacion')
    expect(filtrarSinVaciar([], claves, (i: { id: string }) => i.id)).toEqual([])
  })

  it('compara claves sin distinguir mayúsculas ni espacios', () => {
    const comps = [{ nombre: 'SQL' }, { nombre: 'Ventas' }]
    const claves = clavesDescartadas([descarte('competencia', ' sql ')], 'competencia')
    expect(filtrarSinVaciar(comps, claves, c => c.nombre)).toEqual([{ nombre: 'Ventas' }])
  })
})
