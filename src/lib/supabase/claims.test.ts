import { describe, it, expect, vi } from 'vitest'
import { getUsuarioAutenticado } from './claims'
import { rolDeUsuario } from '@/lib/rol'

type GetClaims = Parameters<typeof getUsuarioAutenticado>[0]['auth']['getClaims']

function clienteCon(resultado: unknown) {
  const getClaims = vi.fn().mockResolvedValue(resultado) as unknown as GetClaims
  return { auth: { getClaims } }
}

describe('getUsuarioAutenticado', () => {
  it('arma el usuario desde los claims del JWT', async () => {
    const supabase = clienteCon({
      data: {
        claims: {
          sub: 'u-1',
          email: 'ana@example.com',
          app_metadata: { rol: 'POSTULANTE' },
        },
      },
      error: null,
    })

    const user = await getUsuarioAutenticado(supabase)

    expect(user).toEqual({
      id: 'u-1',
      email: 'ana@example.com',
      app_metadata: { rol: 'POSTULANTE' },
    })
    // El rol se sigue leyendo de app_metadata, igual que con getUser().
    expect(rolDeUsuario(user)).toBe('POSTULANTE')
  })

  it('sin sesión devuelve null', async () => {
    const supabase = clienteCon({ data: null, error: null })
    expect(await getUsuarioAutenticado(supabase)).toBeNull()
  })

  it('con JWT inválido o vencido devuelve null', async () => {
    const supabase = clienteCon({ data: null, error: new Error('invalid JWT') })
    expect(await getUsuarioAutenticado(supabase)).toBeNull()
  })

  it('sin app_metadata no inventa un rol', async () => {
    const supabase = clienteCon({
      data: { claims: { sub: 'u-2', email: 'x@example.com' } },
      error: null,
    })

    const user = await getUsuarioAutenticado(supabase)

    expect(user?.app_metadata).toEqual({})
    expect(rolDeUsuario(user)).toBeNull()
  })
})
