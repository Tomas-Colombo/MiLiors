import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return { ...actual, cache: (fn: unknown) => fn }
})

vi.mock('../../lib/dal', () => ({
  verifySession: vi.fn().mockResolvedValue({ id: 'user-123' }),
}))
vi.mock('../../lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('../../lib/supabase/server-admin', () => ({ createAdminClient: vi.fn() }))

import { createClient } from '../../lib/supabase/server'
import { createAdminClient } from '../../lib/supabase/server-admin'
import { buscarPostulantes } from './queries'

type Respuesta = { data: unknown; count?: number | null; error: { code: string } | null }

/** Builder encadenable y "awaitable", como el de PostgREST. */
function makeBuilder(respuestas: Respuesta[]) {
  const llamadas: Record<string, unknown[][]> = {}
  const builder: Record<string, unknown> = {}
  for (const metodo of ['select', 'eq', 'in', 'order', 'range', 'regexIMatch']) {
    builder[metodo] = vi.fn((...args: unknown[]) => {
      ;(llamadas[metodo] ??= []).push(args)
      return builder
    })
  }
  // Cada `await` consume la siguiente respuesta; la última se repite.
  let i = 0
  builder.then = (resolve: (r: Respuesta) => unknown) =>
    resolve(respuestas[Math.min(i++, respuestas.length - 1)])
  return { builder, llamadas }
}

function fila(id: string) {
  return {
    id,
    nombre_completo: `Candidato ${id}`,
    carrera_otra: null,
    carrera: { nombre: 'Ingeniería' },
    perfil_en_busqueda: true,
    provincia: { nombre: 'Córdoba' },
    localidad: null,
  }
}

let perfiles: ReturnType<typeof makeBuilder>
let tecnicos: ReturnType<typeof makeBuilder>
let tests: ReturnType<typeof makeBuilder>

function setup(respuestasPerfil: Respuesta[]) {
  perfiles = makeBuilder(respuestasPerfil)
  tecnicos = makeBuilder([{ data: [], error: null }])
  tests = makeBuilder([{ data: [], error: null }])
  vi.mocked(createClient).mockResolvedValue({
    from: vi.fn((tabla: string) => (tabla === 'perfil_postulante' ? perfiles.builder : tecnicos.builder)),
  } as unknown as Awaited<ReturnType<typeof createClient>>)
  vi.mocked(createAdminClient).mockReturnValue({
    from: vi.fn(() => tests.builder),
  } as unknown as ReturnType<typeof createAdminClient>)
}

describe('buscarPostulantes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('pagina en SQL: count exacto, orden determinista y range de 12', async () => {
    setup([{ data: [fila('a'), fila('b')], count: 30, error: null }])

    const r = await buscarPostulantes({ page: '2' })

    expect(perfiles.llamadas.select[0][1]).toEqual({ count: 'exact' })
    expect(perfiles.llamadas.order).toEqual([
      ['nombre_completo', { ascending: true }],
      ['id', { ascending: true }],
    ])
    expect(perfiles.llamadas.range).toEqual([[12, 23]])
    expect(r).toMatchObject({ total: 30, page: 2, pageCount: 3 })
    expect(r.items).toHaveLength(2)
  })

  it('carga competencias y eneatipo sólo para los ids de la página', async () => {
    setup([{ data: [fila('a'), fila('b')], count: 2, error: null }])
    await buscarPostulantes()

    expect(tecnicos.llamadas.in).toEqual([['postulante_id', ['a', 'b']]])
    expect(tests.llamadas.in).toEqual([['postulante_id', ['a', 'b']]])
  })

  it('resuelve el eneatipo con el cliente admin', async () => {
    setup([{ data: [fila('a')], count: 1, error: null }])
    tests = makeBuilder([{
      data: [{
        postulante_id: 'a',
        tiene_empate_dominante: false,
        test_eneagrama_dominante: [{ eneatipo: { numero_eneatipo: 4, nombre: 'Individualista' } }],
      }],
      error: null,
    }])

    const r = await buscarPostulantes()

    expect(r.items[0].eneatipo_numero).toBe(4)
    expect(r.items[0].eneatipo_nombre).toBe('Individualista')
  })

  it('filtra por competencia con un inner join y sin duplicar el filtro en JS', async () => {
    setup([{ data: [fila('a')], count: 1, error: null }])

    await buscarPostulantes({ competenciaId: 'comp-1' })

    expect(String(perfiles.llamadas.select[0][0])).toContain(
      'perfil_tecnico!inner(postulante_competencia!inner(competencia_id))',
    )
    expect(perfiles.llamadas.eq).toContainEqual([
      'perfil_tecnico.postulante_competencia.competencia_id',
      'comp-1',
    ])
  })

  it('no agrega el embed de competencia si no hay filtro', async () => {
    setup([{ data: [fila('a')], count: 1, error: null }])

    await buscarPostulantes()

    expect(String(perfiles.llamadas.select[0][0])).not.toContain('perfil_tecnico')
  })

  it('lleva una página fuera de rango a la última, como paginar', async () => {
    setup([
      { data: null, count: null, error: { code: 'PGRST103' } }, // página 99
      { data: [fila('a')], count: 25, error: null },            // página 1: da el total
      { data: [fila('z')], count: 25, error: null },            // última (3)
    ])

    const r = await buscarPostulantes({ page: '99' })

    expect(perfiles.llamadas.range).toEqual([[1176, 1187], [0, 11], [24, 35]])
    expect(r).toMatchObject({ total: 25, page: 3, pageCount: 3 })
    expect(r.items[0].id).toBe('z')
  })

  it('también reubica cuando la página fuera de rango vuelve vacía sin error', async () => {
    setup([
      { data: [], count: 25, error: null },          // página 3 de un total que ya no llega
      { data: [fila('a')], count: 13, error: null }, // página 1: da el total
      { data: [fila('m')], count: 13, error: null }, // última (2)
    ])

    const r = await buscarPostulantes({ page: '3' })

    expect(perfiles.llamadas.range).toEqual([[24, 35], [0, 11], [12, 23]])
    expect(r).toMatchObject({ total: 13, page: 2, pageCount: 2 })
    expect(r.items[0].id).toBe('m')
  })

  it('lleva page=Infinity a la última página', async () => {
    setup([
      { data: null, count: null, error: { code: 'PGRST103' } },
      { data: [fila('a')], count: 5, error: null },
    ])

    const r = await buscarPostulantes({ page: 'Infinity' })

    expect(r).toMatchObject({ total: 5, page: 1, pageCount: 1 })
    expect(r.items[0].id).toBe('a')
  })

  it('normaliza páginas inválidas a la 1', async () => {
    setup([{ data: [fila('a')], count: 1, error: null }])

    const r = await buscarPostulantes({ page: '-3' })

    expect(perfiles.llamadas.range).toEqual([[0, 11]])
    expect(r.page).toBe(1)
  })

  it('devuelve vacío y loguea si la query principal falla', async () => {
    setup([{ data: null, count: null, error: { code: 'XX000' } }])

    const r = await buscarPostulantes()

    expect(r).toEqual({ items: [], total: 0, page: 1, pageCount: 1 })
    expect(console.error).toHaveBeenCalled()
  })
})
