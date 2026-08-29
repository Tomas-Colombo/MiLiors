import { describe, it, expect } from 'vitest'
import {
  normalizarTexto,
  coincideBusqueda,
  mismoTexto,
  patronSinTildes,
  patronTextoCompleto,
} from './texto'

describe('normalizarTexto', () => {
  it('saca tildes y diéresis, y baja a minúsculas', () => {
    expect(normalizarTexto('Ingeniería')).toBe('ingenieria')
    expect(normalizarTexto('  Administración  ')).toBe('administracion')
    expect(normalizarTexto('Pingüino')).toBe('pinguino')
  })

  it('conserva la ñ: en castellano no es una n acentuada', () => {
    expect(normalizarTexto('Diseño')).toBe('diseño')
    expect(normalizarTexto('año')).not.toBe('ano')
  })
})

describe('coincideBusqueda', () => {
  it('encuentra la carrera aunque se escriba sin tilde', () => {
    expect(coincideBusqueda('Ingeniería en Sistemas', 'ingenieria')).toBe(true)
    expect(coincideBusqueda('Ingeniería en Sistemas', 'INGENIERÍA')).toBe(true)
  })

  it('también al revés: se busca con tilde y el dato no la tiene', () => {
    expect(coincideBusqueda('Ingenieria en Sistemas', 'ingeniería')).toBe(true)
  })

  it('una consulta vacía no filtra nada', () => {
    expect(coincideBusqueda('Cualquier cosa', '   ')).toBe(true)
  })

  it('sigue descartando lo que no coincide', () => {
    expect(coincideBusqueda('Ingeniería en Sistemas', 'medicina')).toBe(false)
  })
})

describe('mismoTexto', () => {
  it('iguala escrituras con y sin tilde', () => {
    expect(mismoTexto('Contaduría', 'contaduria')).toBe(true)
    expect(mismoTexto('Contaduría', 'contabilidad')).toBe(false)
  })
})

describe('patronSinTildes', () => {
  it('abre cada vocal a sus variantes acentuadas', () => {
    const patron = patronSinTildes('ingenieria')
    expect(new RegExp(patron, 'i').test('Ingeniería en Sistemas')).toBe(true)
    expect(new RegExp(patron, 'i').test('Ingenieria en Sistemas')).toBe(true)
  })

  it('escapa los metacaracteres para que no se lean como regex', () => {
    // Un `+` o un `(` sin escapar reventarían el regex del lado de Postgres.
    expect(patronSinTildes('c++')).toBe('[cç]\\+\\+')
    expect(new RegExp(patronSinTildes('c++'), 'i').test('Dev C++')).toBe(true)
    expect(new RegExp(patronSinTildes('a.c'), 'i').test('abc')).toBe(false)
  })

  it('no confunde la ñ con la n', () => {
    expect(new RegExp(patronSinTildes('diseño'), 'i').test('Diseño Gráfico')).toBe(true)
    expect(new RegExp(patronSinTildes('diseno'), 'i').test('Diseño Gráfico')).toBe(false)
  })
})

describe('patronTextoCompleto', () => {
  const matchea = (patron: string, texto: string) => new RegExp(patron, 'i').test(texto)

  it('iguala el nombre entero aunque cambien las tildes', () => {
    const patron = patronTextoCompleto('Ingenieria en Sistemas')
    expect(matchea(patron, 'Ingeniería en Sistemas')).toBe(true)
    expect(matchea(patron, 'INGENIERIA EN SISTEMAS')).toBe(true)
  })

  it('no matchea de prefijo: promover "Derecho" no toca "Derecho del Trabajo"', () => {
    const patron = patronTextoCompleto('Derecho')
    expect(matchea(patron, 'Derecho')).toBe(true)
    expect(matchea(patron, 'Derecho del Trabajo')).toBe(false)
  })

  it('tampoco matchea de sufijo', () => {
    expect(matchea(patronTextoCompleto('Sistemas'), 'Ingeniería en Sistemas')).toBe(false)
  })
})
