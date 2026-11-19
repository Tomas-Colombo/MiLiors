import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('server-only', () => ({}))

const jar = new Map<string, string>()
const store = {
  get: vi.fn((name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined)),
  set: vi.fn((name: string, value: string) => void jar.set(name, value)),
  delete: vi.fn((name: string) => void jar.delete(name)),
}
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => store) }))

import { adoptarDestino, borrarDestino, guardarDestino, leerDestino, COOKIE_DESTINO } from './destino-cookie'

const TOKEN = 'A'.repeat(32)
const DESTINO = `/empleos/${TOKEN}`

function sembrar(valor: string) {
  jar.set(COOKIE_DESTINO, valor)
}

describe('destino-cookie', () => {
  beforeEach(() => {
    jar.clear()
    vi.clearAllMocks()
  })

  it('guarda destino y dueño, httpOnly/lax/7 días', async () => {
    await guardarDestino(DESTINO, 'u1')
    expect(JSON.parse(jar.get(COOKIE_DESTINO)!)).toEqual({ d: DESTINO, u: 'u1' })
    expect(store.set).toHaveBeenCalledWith(
      COOKIE_DESTINO,
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 }),
    )
  })

  it('el registro guarda sin dueño (u: null)', async () => {
    await guardarDestino(DESTINO)
    expect(JSON.parse(jar.get(COOKIE_DESTINO)!)).toEqual({ d: DESTINO, u: null })
  })

  it('no guarda un destino peligroso', async () => {
    await guardarDestino('//evil.com', 'u1')
    expect(store.set).not.toHaveBeenCalled()
  })

  it('leerDestino: del mismo usuario o sin dueño sí; de otro no', async () => {
    sembrar(JSON.stringify({ d: DESTINO, u: 'u1' }))
    expect(await leerDestino('u1')).toBe(DESTINO)
    expect(await leerDestino('u2')).toBeNull()
    expect(await leerDestino(null)).toBeNull()
    sembrar(JSON.stringify({ d: DESTINO, u: null }))
    expect(await leerDestino('u2')).toBe(DESTINO)
  })

  it.each([
    DESTINO, // formato viejo: string suelto
    'no es json{',
    JSON.stringify(null),
    JSON.stringify({ d: 42, u: null }),
    JSON.stringify({ d: DESTINO, u: 7 }),
    JSON.stringify({ d: '//evil.com', u: null }), // se vuelve a sanear al leer
  ])('ignora el valor ilegible %s', async (valor) => {
    sembrar(valor)
    expect(await leerDestino('u1')).toBeNull()
    expect(await adoptarDestino('u1')).toBeNull()
  })

  it('adoptarDestino ata al usuario una cookie sin dueño', async () => {
    sembrar(JSON.stringify({ d: DESTINO, u: null }))
    expect(await adoptarDestino('u1')).toBe(DESTINO)
    expect(JSON.parse(jar.get(COOKIE_DESTINO)!)).toEqual({ d: DESTINO, u: 'u1' })
  })

  it('adoptarDestino ignora Y borra la cookie de otro usuario', async () => {
    sembrar(JSON.stringify({ d: DESTINO, u: 'otro' }))
    expect(await adoptarDestino('u1')).toBeNull()
    expect(jar.has(COOKIE_DESTINO)).toBe(false)
  })

  it('adoptarDestino respeta la cookie del mismo usuario sin reescribirla', async () => {
    sembrar(JSON.stringify({ d: DESTINO, u: 'u1' }))
    expect(await adoptarDestino('u1')).toBe(DESTINO)
    expect(store.set).not.toHaveBeenCalled()
  })

  it('borrarDestino elimina la cookie', async () => {
    sembrar(JSON.stringify({ d: DESTINO, u: 'u1' }))
    await borrarDestino()
    expect(jar.has(COOKIE_DESTINO)).toBe(false)
  })
})
