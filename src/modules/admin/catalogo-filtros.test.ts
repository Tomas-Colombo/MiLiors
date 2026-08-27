import { describe, expect, it } from 'vitest'
import {
  describirFiltrosCatalogo,
  filtrarCatalogo,
  finDelDia,
  ordenarCatalogo,
  qsExportCatalogo,
} from './catalogo-filtros'

/**
 * Estas funciones son el contrato entre la pantalla y el .xlsx: las dos las
 * llaman con los mismos parámetros. Si acá se rompe algo, el archivo deja de
 * coincidir con lo que el admin está viendo, que es el bug más caro de esta
 * pantalla porque no se nota hasta que alguien cuenta las filas a mano.
 */

type Fila = { nombre: string; baja: string | null; alta: string }

const acc = {
  nombre: (f: Fila) => f.nombre,
  activo: (f: Fila) => !f.baja,
  createdAt: (f: Fila) => f.alta,
}

const FILAS: Fila[] = [
  { nombre: 'React', baja: null, alta: '2026-01-10T10:00:00.000Z' },
  { nombre: 'Angular', baja: '2026-02-01T10:00:00.000Z', alta: '2026-02-15T10:00:00.000Z' },
  { nombre: 'Svelte', baja: null, alta: '2026-03-20T10:00:00.000Z' },
]

describe('filtrarCatalogo', () => {
  it('busca sin distinguir mayúsculas', () => {
    expect(filtrarCatalogo(FILAS, { q: 'REACT' }, acc).map(f => f.nombre)).toEqual(['React'])
  })

  it('acepta las dos formas del filtro de estado', () => {
    // Cada pantalla usa su género ('activo' en idiomas, 'activa' en habilidades,
    // 'baja' en empresas): las tres tienen que significar lo mismo.
    for (const estado of ['activo', 'activa']) {
      expect(filtrarCatalogo(FILAS, { estado }, acc).map(f => f.nombre)).toEqual(['React', 'Svelte'])
    }
    for (const estado of ['inactivo', 'inactiva', 'baja']) {
      expect(filtrarCatalogo(FILAS, { estado }, acc).map(f => f.nombre)).toEqual(['Angular'])
    }
  })

  it('incluye lo cargado el mismo día del corte superior', () => {
    // Sin extender `hasta` al final del día, un alta de las 10 AM del 20 de
    // marzo queda afuera de "hasta el 2026-03-20".
    const r = filtrarCatalogo(FILAS, { desde: '2026-03-01', hasta: '2026-03-20' }, acc)
    expect(r.map(f => f.nombre)).toEqual(['Svelte'])
  })

  it('busca también en los campos extra', () => {
    const empresas = [
      { nombre: 'Acme', baja: null, alta: '2026-01-01T00:00:00.000Z', rec: ['ana@acme.com'] },
      { nombre: 'Globex', baja: null, alta: '2026-01-01T00:00:00.000Z', rec: [] as string[] },
    ]
    const r = filtrarCatalogo(empresas, { q: 'ana@' }, {
      nombre: e => e.nombre,
      activo: () => true,
      createdAt: e => e.alta,
      buscarTambienEn: e => e.rec,
    })
    expect(r.map(e => e.nombre)).toEqual(['Acme'])
  })

  it('sin filtros devuelve todo', () => {
    expect(filtrarCatalogo(FILAS, {}, acc)).toHaveLength(3)
  })
})

describe('ordenarCatalogo', () => {
  it('respeta el orden de la consulta cuando no se pide nada', () => {
    // Mismo array, sin copiar: el orden por defecto lo define la query.
    expect(ordenarCatalogo(FILAS, undefined, acc)).toBe(FILAS)
  })

  it('ordena por nombre y por fecha de alta en los dos sentidos', () => {
    expect(ordenarCatalogo(FILAS, 'nombre', acc).map(f => f.nombre)).toEqual([
      'Angular',
      'React',
      'Svelte',
    ])
    expect(ordenarCatalogo(FILAS, 'nombre_desc', acc).map(f => f.nombre)).toEqual([
      'Svelte',
      'React',
      'Angular',
    ])
    expect(ordenarCatalogo(FILAS, 'alta_desc', acc)[0].nombre).toBe('Svelte')
    expect(ordenarCatalogo(FILAS, 'alta_asc', acc)[0].nombre).toBe('React')
    // 'antiguas' es el alias que usa la pantalla de empresas.
    expect(ordenarCatalogo(FILAS, 'antiguas', acc)[0].nombre).toBe('React')
  })

  it('no muta el array original', () => {
    const copia = [...FILAS]
    ordenarCatalogo(FILAS, 'nombre_desc', acc)
    expect(FILAS).toEqual(copia)
  })
})

describe('finDelDia', () => {
  it('extiende la fecha al último instante del día', () => {
    expect(finDelDia('2026-03-20')).toBe('2026-03-20T23:59:59.999Z')
    expect(finDelDia(undefined)).toBe('')
  })
})

describe('describirFiltrosCatalogo', () => {
  it('dice explícitamente cuando no hay recorte', () => {
    expect(describirFiltrosCatalogo({})).toBe('Incluye todo el catálogo, sin filtros.')
  })

  it('enumera los filtros aplicados en castellano', () => {
    const d = describirFiltrosCatalogo({ q: 'react', estado: 'activa', desde: '2026-01-01' })
    expect(d).toContain('react')
    expect(d).toContain('sólo activos')
    expect(d).toContain('alta desde el 2026-01-01')
  })
})

describe('qsExportCatalogo', () => {
  it('descarta las claves vacías', () => {
    const qs = new URLSearchParams(
      qsExportCatalogo('idiomas', { q: 'ita', estado: '', desde: undefined, hasta: '   ' }),
    )
    expect(qs.get('recurso')).toBe('idiomas')
    expect(qs.get('q')).toBe('ita')
    expect(qs.has('estado')).toBe(false)
    expect(qs.has('desde')).toBe(false)
    expect(qs.has('hasta')).toBe(false)
  })
})
