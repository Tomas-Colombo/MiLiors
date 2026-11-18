import { describe, it, expect, vi, beforeEach } from 'vitest'
import { iniciarSesion, registrarUsuario } from './actions'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { adoptarDestino, borrarDestino, guardarDestino } from '@/lib/destino-cookie'
import { getPuestoPorEnlace } from '@/modules/puestos/queries'
import { INITIAL_ACTION_STATE } from '@/lib/types/domain'

// redirect() de Next lanza para cortar la ejecución; el test lee el destino del error.
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/server-admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/destino-cookie', () => ({
  guardarDestino: vi.fn(),
  adoptarDestino: vi.fn(),
  borrarDestino: vi.fn(),
}))
vi.mock('@/modules/puestos/queries', () => ({ getPuestoPorEnlace: vi.fn() }))

const TOKEN = 'A'.repeat(32)

function formData(campos: Record<string, string>) {
  const fd = new FormData()
  for (const [k, v] of Object.entries(campos)) fd.set(k, v)
  return fd
}

/** Admin que acepta cualquier escritura; `existente` simula un email ya registrado. */
function adminFalso(inserts: { tabla: string; payload: unknown }[] = []) {
  const from = vi.fn((tabla: string) => {
    const builder: Record<string, unknown> = {}
    builder.select = vi.fn(() => builder)
    builder.eq = vi.fn(() => builder)
    builder.update = vi.fn(() => builder)
    builder.upsert = vi.fn(() => Promise.resolve({ error: null }))
    builder.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }))
    builder.insert = vi.fn((payload: unknown) => {
      inserts.push({ tabla, payload })
      return Promise.resolve({ error: null })
    })
    ;(builder as { then: unknown }).then = (resolve: (v: unknown) => void) => resolve({ error: null })
    return builder
  })
  vi.mocked(createAdminClient).mockReturnValue({
    from,
    auth: { admin: { getUserById: vi.fn(), deleteUser: vi.fn() } },
  } as unknown as ReturnType<typeof createAdminClient>)
}

function supabaseLogin(rol: 'POSTULANTE' | 'RECLUTADOR') {
  vi.mocked(createClient).mockResolvedValue({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: { id: 'u1', app_metadata: { rol } } },
        error: null,
      }),
      signOut: vi.fn(),
    },
  } as unknown as Awaited<ReturnType<typeof createClient>>)
}

async function destinoDe(promesa: Promise<unknown>): Promise<string> {
  try {
    await promesa
  } catch (e) {
    const m = /^REDIRECT:(.*)$/.exec((e as Error).message)
    if (m) return m[1]
    throw e
  }
  throw new Error('no redirigió')
}

describe('iniciarSesion — destino después del login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(adoptarDestino).mockResolvedValue(null)
    vi.mocked(getPuestoPorEnlace).mockResolvedValue({ puestoId: 'p1' } as never)
    adminFalso()
  })

  const login = (extra: Record<string, string> = {}) =>
    iniciarSesion(INITIAL_ACTION_STATE, formData({ email: 'a@example.test', password: 'Secreta123', ...extra }))

  it('sin next ni cookie va al panel del rol', async () => {
    supabaseLogin('POSTULANTE')
    expect(await destinoDe(login())).toBe('/postulante')
  })

  it('con next válido va ahí y lo guarda en la cookie', async () => {
    supabaseLogin('POSTULANTE')
    expect(await destinoDe(login({ next: `/empleos/${TOKEN}` }))).toBe(`/empleos/${TOKEN}`)
    expect(guardarDestino).toHaveBeenCalledWith(`/empleos/${TOKEN}`, 'u1')
  })

  it.each(['https://evil.com', '//evil.com', '/\\evil.com', '/admin'])(
    'ignora el next peligroso %s y va al panel',
    async (next) => {
      supabaseLogin('POSTULANTE')
      expect(await destinoDe(login({ next }))).toBe('/postulante')
      expect(guardarDestino).not.toHaveBeenCalled()
    },
  )

  it('un reclutador con next=/empleos/... va a la vista previa', async () => {
    supabaseLogin('RECLUTADOR')
    expect(await destinoDe(login({ next: `/empleos/${TOKEN}` }))).toBe(`/empleos/${TOKEN}`)
    // Un reclutador que prueba su propio link no deja cookie de destino.
    expect(guardarDestino).not.toHaveBeenCalled()
  })

  it('un reclutador no adopta la cookie de destino y va a su panel', async () => {
    supabaseLogin('RECLUTADOR')
    vi.mocked(adoptarDestino).mockResolvedValue(`/empleos/${TOKEN}`)
    expect(await destinoDe(login())).toBe('/reclutador')
    expect(adoptarDestino).not.toHaveBeenCalled()
  })

  it('un reclutador con next=/postulante/... va a su panel', async () => {
    supabaseLogin('RECLUTADOR')
    expect(await destinoDe(login({ next: '/postulante/puestos/x' }))).toBe('/reclutador')
  })

  it('sin next usa la cookie del registro', async () => {
    supabaseLogin('POSTULANTE')
    vi.mocked(adoptarDestino).mockResolvedValue(`/empleos/${TOKEN}`)
    expect(await destinoDe(login())).toBe(`/empleos/${TOKEN}`)
    expect(adoptarDestino).toHaveBeenCalledWith('u1')
  })

  it('sin next, si el token de la cookie ya no resuelve, borra la cookie y va al panel', async () => {
    supabaseLogin('POSTULANTE')
    vi.mocked(adoptarDestino).mockResolvedValue(`/empleos/${TOKEN}`)
    vi.mocked(getPuestoPorEnlace).mockResolvedValue(null)
    expect(await destinoDe(login())).toBe('/postulante')
    expect(borrarDestino).toHaveBeenCalledTimes(1)
  })

  it('el next del formulario gana sobre la cookie', async () => {
    supabaseLogin('POSTULANTE')
    vi.mocked(adoptarDestino).mockResolvedValue('/postulante/puestos/viejo')
    expect(await destinoDe(login({ next: `/empleos/${TOKEN}` }))).toBe(`/empleos/${TOKEN}`)
  })
})

describe('registrarUsuario — registro con destino', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function supabaseRegistro() {
    const signUp = vi.fn().mockResolvedValue({
      data: { user: { id: 'u1', identities: [{}] }, session: null },
      error: null,
    })
    vi.mocked(createClient).mockResolvedValue({
      auth: { signUp, resend: vi.fn() },
    } as unknown as Awaited<ReturnType<typeof createClient>>)
    return signUp
  }

  const campos = { email: 'nuevo@example.test', password: 'Secreta123', confirmPassword: 'Secreta123' }

  it('con next fuerza rol POSTULANTE aunque el formulario mande RECLUTADOR, y guarda el destino', async () => {
    supabaseRegistro()
    const inserts: { tabla: string; payload: unknown }[] = []
    adminFalso(inserts)

    const res = await registrarUsuario(
      INITIAL_ACTION_STATE as never,
      formData({ ...campos, rol: 'RECLUTADOR', next: `/empleos/${TOKEN}` }),
    )

    expect(res.success).toBe(true)
    expect(inserts).toEqual([
      expect.objectContaining({ tabla: 'usuario', payload: expect.objectContaining({ rol_usuario: 'POSTULANTE' }) }),
    ])
    expect(guardarDestino).toHaveBeenCalledWith(`/empleos/${TOKEN}`)
  })

  it('con next válido y sin rol elegido igual se registra como POSTULANTE', async () => {
    supabaseRegistro()
    adminFalso()
    const res = await registrarUsuario(
      INITIAL_ACTION_STATE as never,
      formData({ ...campos, rol: '', next: `/empleos/${TOKEN}` }),
    )
    expect(res.success).toBe(true)
  })

  it('un next peligroso se ignora: respeta el rol elegido y no guarda cookie', async () => {
    supabaseRegistro()
    const inserts: { tabla: string; payload: unknown }[] = []
    adminFalso(inserts)

    await registrarUsuario(
      INITIAL_ACTION_STATE as never,
      formData({ ...campos, rol: 'RECLUTADOR', next: '//evil.com' }),
    )

    expect(inserts[0]).toEqual(
      expect.objectContaining({ payload: expect.objectContaining({ rol_usuario: 'RECLUTADOR' }) }),
    )
    expect(guardarDestino).not.toHaveBeenCalled()
  })
})
