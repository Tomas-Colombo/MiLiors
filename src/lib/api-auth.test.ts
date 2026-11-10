import { describe, it, expect, vi, beforeEach } from 'vitest'
import { autorizarAdmin } from './api-auth'
import { getSessionUser } from '@/lib/dal'

vi.mock('@/lib/dal', () => ({
  getSessionUser: vi.fn(),
}))

describe('autorizarAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devuelve 401 si no hay sesión activa', async () => {
    vi.mocked(getSessionUser).mockResolvedValueOnce(null)

    const res = await autorizarAdmin()
    expect(res).toEqual({ ok: false, status: 401 })
  })

  it('devuelve 403 si el rol no es ADMIN', async () => {
    vi.mocked(getSessionUser).mockResolvedValueOnce({
      id: 'usr-1',
      email: 'postulante@example.com',
      rol: 'POSTULANTE',
    })

    const res = await autorizarAdmin()
    expect(res).toEqual({ ok: false, status: 403 })
  })

  it('devuelve ok con la sesión si el rol es ADMIN', async () => {
    const adminSession = {
      id: 'adm-1',
      email: 'admin@example.com',
      rol: 'ADMIN' as const,
    }
    vi.mocked(getSessionUser).mockResolvedValueOnce(adminSession)

    const res = await autorizarAdmin()
    expect(res).toEqual({ ok: true, session: adminSession })
  })
})
