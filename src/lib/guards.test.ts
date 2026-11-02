import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requireAdmin } from './guards'
import { verifySession } from './dal'

vi.mock('./dal', () => ({
  verifySession: vi.fn(),
}))

describe('requireAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devuelve la sesión cuando el rol del usuario es ADMIN', async () => {
    const sesionAdmin = {
      id: 'admin-123',
      email: 'admin@miliors.com',
      rol: 'ADMIN' as const,
    }
    vi.mocked(verifySession).mockResolvedValueOnce(sesionAdmin)

    const resultado = await requireAdmin()
    expect(resultado).toEqual(sesionAdmin)
  })

  it('lanza "Acceso denegado." cuando el rol del usuario es POSTULANTE', async () => {
    const sesionPostulante = {
      id: 'post-123',
      email: 'postulante@miliors.com',
      rol: 'POSTULANTE' as const,
    }
    vi.mocked(verifySession).mockResolvedValueOnce(sesionPostulante)

    await expect(requireAdmin()).rejects.toThrow('Acceso denegado.')
  })

  it('lanza "Acceso denegado." cuando el rol del usuario es RECLUTADOR', async () => {
    const sesionReclutador = {
      id: 'rec-123',
      email: 'reclutador@miliors.com',
      rol: 'RECLUTADOR' as const,
    }
    vi.mocked(verifySession).mockResolvedValueOnce(sesionReclutador)

    await expect(requireAdmin()).rejects.toThrow('Acceso denegado.')
  })
})
