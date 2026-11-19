import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolverAccesoPuesto, esTokenEnlaceValido } from './acceso'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { getSessionUser } from '@/lib/dal'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/server-admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/dal', () => ({ getSessionUser: vi.fn() }))

const PUESTO_A = '11111111-1111-4111-8111-111111111111'
const PUESTO_B = '22222222-2222-4222-8222-222222222222'
const TOKEN_A = 'A'.repeat(32)
const TOKEN_B = 'b-_'.repeat(10) + 'zz'

type Fila = Record<string, unknown>

/**
 * Cliente mínimo con filtros reales: cada `.eq` descarta las filas que no
 * coinciden, así que un token de otro puesto no matchea de verdad. Los filtros
 * `.is` sobre columnas embebidas ("puesto.fecha_baja_puesto") se resuelven contra
 * `fila.puesto`.
 */
function makeCliente(tablas: Record<string, Fila[]>) {
  const from = vi.fn((tabla: string) => {
    let filas = [...(tablas[tabla] ?? [])]
    const leer = (fila: Fila, columna: string): unknown => {
      const [cabeza, cola] = columna.split('.')
      if (!cola) return fila[cabeza]
      return (fila[cabeza] as Fila | undefined)?.[cola]
    }
    const builder: Record<string, unknown> = {}
    builder.select = vi.fn(() => builder)
    builder.eq = vi.fn((columna: string, valor: unknown) => {
      filas = filas.filter((f) => leer(f, columna) === valor)
      return builder
    })
    builder.is = vi.fn((columna: string, valor: unknown) => {
      filas = filas.filter((f) => leer(f, columna) === valor)
      return builder
    })
    builder.limit = vi.fn(() => builder)
    builder.maybeSingle = vi.fn(() => Promise.resolve({ data: filas[0] ?? null, error: null }))
    builder.then = (resolve: (r: { data: Fila[]; error: null }) => unknown) =>
      resolve({ data: filas, error: null })
    return builder
  })
  return { from } as unknown as Awaited<ReturnType<typeof createClient>>
}

function setup({
  puestosRls = [] as Fila[],
  enlaces = [] as Fila[],
  postulaciones = [] as Fila[],
  usuarioId = null as string | null,
} = {}) {
  vi.mocked(createClient).mockResolvedValue(makeCliente({ puesto: puestosRls, postulacion: postulaciones }))
  vi.mocked(createAdminClient).mockReturnValue(
    makeCliente({ puesto_enlace: enlaces }) as unknown as ReturnType<typeof createAdminClient>,
  )
  vi.mocked(getSessionUser).mockResolvedValue(
    usuarioId ? { id: usuarioId, email: 'a@example.test', rol: 'POSTULANTE' } : null,
  )
}

const puestoPublico = (id: string, extra: Fila = {}) => ({
  id,
  activo: true,
  visibilidad: 'PUBLICA',
  fecha_baja_puesto: null,
  ...extra,
})

describe('esTokenEnlaceValido', () => {
  it('acepta 32 caracteres base64url', () => {
    expect(esTokenEnlaceValido(TOKEN_A)).toBe(true)
    expect(esTokenEnlaceValido(TOKEN_B)).toBe(true)
  })

  it.each([
    ['vacío', ''],
    ['corto', 'a'.repeat(31)],
    ['largo', 'a'.repeat(33)],
    ['con padding', 'a'.repeat(31) + '='],
    ['con barra', 'a'.repeat(31) + '/'],
    ['con espacio', 'a'.repeat(31) + ' '],
    ['con salto de línea', 'a'.repeat(31) + '\n'],
    ['con comilla', 'a'.repeat(31) + "'"],
  ])('rechaza un token %s', (_nombre, token) => {
    expect(esTokenEnlaceValido(token)).toBe(false)
  })

  it('rechaza lo que no es string', () => {
    expect(esTokenEnlaceValido(undefined)).toBe(false)
    expect(esTokenEnlaceValido(null)).toBe(false)
    expect(esTokenEnlaceValido(123)).toBe(false)
  })
})

describe('resolverAccesoPuesto', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('da acceso "publico" a un puesto activo, público y sin baja', async () => {
    setup({ puestosRls: [puestoPublico(PUESTO_A)] })
    expect(await resolverAccesoPuesto(PUESTO_A)).toEqual({ via: 'publico' })
  })

  it('no da acceso "publico" a un puesto privado aunque RLS lo devuelva (dueño/admin)', async () => {
    setup({ puestosRls: [puestoPublico(PUESTO_A, { visibilidad: 'PRIVADA' })] })
    expect(await resolverAccesoPuesto(PUESTO_A)).toBeNull()
  })

  it('no da acceso "publico" a un puesto pausado o dado de baja', async () => {
    setup({ puestosRls: [puestoPublico(PUESTO_A, { activo: false })] })
    expect(await resolverAccesoPuesto(PUESTO_A)).toBeNull()

    setup({ puestosRls: [puestoPublico(PUESTO_A, { fecha_baja_puesto: '2026-11-01T00:00:00Z' })] })
    expect(await resolverAccesoPuesto(PUESTO_A)).toBeNull()
  })

  it('da acceso "enlace" con el token del propio puesto privado', async () => {
    setup({
      enlaces: [{ puesto_id: PUESTO_A, token: TOKEN_A, puesto: { fecha_baja_puesto: null } }],
    })
    expect(await resolverAccesoPuesto(PUESTO_A, TOKEN_A)).toEqual({ via: 'enlace' })
  })

  it('rechaza un token válido de otro puesto', async () => {
    setup({
      enlaces: [
        { puesto_id: PUESTO_A, token: TOKEN_A, puesto: { fecha_baja_puesto: null } },
        { puesto_id: PUESTO_B, token: TOKEN_B, puesto: { fecha_baja_puesto: null } },
      ],
    })
    // El token de B con el id de A, y al revés.
    expect(await resolverAccesoPuesto(PUESTO_A, TOKEN_B)).toBeNull()
    expect(await resolverAccesoPuesto(PUESTO_B, TOKEN_A)).toBeNull()
  })

  it('rechaza un token que ya no existe (regenerado)', async () => {
    setup({
      enlaces: [{ puesto_id: PUESTO_A, token: TOKEN_B, puesto: { fecha_baja_puesto: null } }],
    })
    expect(await resolverAccesoPuesto(PUESTO_A, TOKEN_A)).toBeNull()
  })

  it('rechaza el token de un puesto dado de baja', async () => {
    setup({
      enlaces: [{ puesto_id: PUESTO_A, token: TOKEN_A, puesto: { fecha_baja_puesto: '2026-11-01T00:00:00Z' } }],
    })
    expect(await resolverAccesoPuesto(PUESTO_A, TOKEN_A)).toBeNull()
  })

  it('no consulta la base con un token de formato inválido', async () => {
    setup({
      enlaces: [{ puesto_id: PUESTO_A, token: TOKEN_A, puesto: { fecha_baja_puesto: null } }],
    })
    expect(await resolverAccesoPuesto(PUESTO_A, "' or 1=1 --")).toBeNull()
    expect(await resolverAccesoPuesto(PUESTO_A, '')).toBeNull()
    expect(await resolverAccesoPuesto(PUESTO_A, null)).toBeNull()
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('da acceso "postulado" a quien ya se postuló, aunque el puesto sea privado y sin link', async () => {
    setup({
      postulaciones: [{ puesto_id: PUESTO_A, perfil_postulante: { usuario_id: 'user-1' } }],
      usuarioId: 'user-1',
    })
    expect(await resolverAccesoPuesto(PUESTO_A)).toEqual({ via: 'postulado' })
  })

  it('no da acceso a quien no tiene postulación en ese puesto', async () => {
    setup({
      postulaciones: [
        { puesto_id: PUESTO_A, perfil_postulante: { usuario_id: 'user-2' } },
        { puesto_id: PUESTO_B, perfil_postulante: { usuario_id: 'user-1' } },
      ],
      usuarioId: 'user-1',
    })
    expect(await resolverAccesoPuesto(PUESTO_A)).toBeNull()
  })

  it('sin sesión y sin link no hay acceso a un puesto privado', async () => {
    setup()
    expect(await resolverAccesoPuesto(PUESTO_A)).toBeNull()
  })
})
