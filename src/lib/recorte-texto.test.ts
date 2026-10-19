import { describe, it, expect } from 'vitest'
import { recortarEnOracion } from './recorte-texto'

describe('recortarEnOracion', () => {
  it('devuelve el texto entero, sin espacios en los extremos, si entra', () => {
    expect(recortarEnOracion('  Una oración. Otra más.  ', 100)).toBe('Una oración. Otra más.')
  })

  it('corta en el último terminador que entra', () => {
    const t = 'Primera oración. Segunda oración. Tercera oración larga que no entra.'
    expect(recortarEnOracion(t, 40)).toBe('Primera oración. Segunda oración.')
  })

  it('acepta que la oración termine justo en el máximo', () => {
    expect(recortarEnOracion('Hola mundo. Chau', 11)).toBe('Hola mundo.')
  })

  it('reconoce ! ? … y los cierres de comillas o paréntesis', () => {
    expect(recortarEnOracion('¿Funciona? Sí. Seguimos con más texto acá', 14)).toBe('¿Funciona? Sí.')
    expect(recortarEnOracion('Dijo "listo." Y siguió con otra idea larga', 16)).toBe('Dijo "listo."')
    expect(recortarEnOracion('Fue un éxito (según él). Después no se supo más', 26)).toBe('Fue un éxito (según él).')
    expect(recortarEnOracion('Esperá… Ya vuelvo con la respuesta completa', 10)).toBe('Esperá…')
  })

  it('no corta en un punto que no cierra la oración', () => {
    const t = 'La versión 3.5 mejora todo. Ahora viene un texto más largo que no entra'
    expect(recortarEnOracion(t, 20)).toBe('La versión 3.5…')
  })

  it('sin terminador, corta en palabra entera y agrega …', () => {
    const r = recortarEnOracion('uno dos tres cuatro cinco seis', 15)
    expect(r).toBe('uno dos tres…')
    expect(r.length).toBeLessThanOrEqual(15)
  })

  it('no deja coma ni dos puntos colgando antes de la elipsis', () => {
    expect(recortarEnOracion('uno dos, tres cuatro cinco', 10)).toBe('uno dos…')
  })

  it('una sola palabra más larga que el máximo se corta duro', () => {
    const r = recortarEnOracion('Supercalifragilistico', 8)
    expect(r).toBe('Superca…')
    expect(r.length).toBeLessThanOrEqual(8)
  })

  it('descarta un corte por oración que deja menos de la mitad del máximo', () => {
    const lista = '1. uno dos tres cuatro cinco seis siete ocho nueve diez'
    const r = recortarEnOracion(lista, 30)
    expect(r).not.toBe('1.')
    expect(r).toBe('1. uno dos tres cuatro cinco…')
    expect(recortarEnOracion('Sr. Pérez trabajó en varias empresas de logística', 24)).toBe('Sr. Pérez trabajó en…')
  })

  it('acepta un corte por oración que conserva al menos la mitad', () => {
    expect(recortarEnOracion('Diez letras. Y sigue otra parte larga', 20)).toBe('Diez letras.')
  })

  it('nunca devuelve vacío para un texto no vacío con max >= 1', () => {
    expect(recortarEnOracion('Hola mundo', 1)).toBe('H')
    expect(recortarEnOracion('Hola mundo', 2)).not.toBe('')
    expect(recortarEnOracion('Supercalifragilistico', 1)).toBe('S')
  })

  it('max no positivo devuelve vacío', () => {
    expect(recortarEnOracion('Hola.', 0)).toBe('')
  })
})
