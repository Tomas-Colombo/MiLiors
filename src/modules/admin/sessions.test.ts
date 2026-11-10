import { describe, it, expect, vi, beforeEach } from 'vitest'
import { revocarSesion } from './sessions'
import { requireAdmin } from '@/lib/guards'
import { createAdminClient } from '@/lib/supabase/server-admin'

vi.mock('@/lib/guards', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/supabase/server-admin', () => ({
  createAdminClient: vi.fn(),
}))

describe('revocarSesion', () => {
  const adminSession = {
    id: 'admin-123',
    email: 'admin@miliors.com',
    rol: 'ADMIN' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAdmin).mockResolvedValue(adminSession)
  })

  it('guarda 1: rechaza revocar la propia sesión', async () => {
    const res = await revocarSesion('admin-123')
    expect(res).toEqual({
      success: false,
      error: 'No podés revocar tu propia sesión.',
    })
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('guarda 2: rechaza si el usuario no existe', async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

    vi.mocked(createAdminClient).mockReturnValue({
      from: mockFrom,
    } as unknown as ReturnType<typeof createAdminClient>)

    const res = await revocarSesion('usuario-inexistente')
    expect(res).toEqual({
      success: false,
      error: 'Usuario inválido.',
    })
    expect(mockFrom).toHaveBeenCalledWith('usuario')
    expect(mockSelect).toHaveBeenCalledWith('rol_usuario')
    expect(mockEq).toHaveBeenCalledWith('id', 'usuario-inexistente')
  })

  it('guarda 3: rechaza revocar la sesión de otro administrador', async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { rol_usuario: 'ADMIN' },
      error: null,
    })
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

    vi.mocked(createAdminClient).mockReturnValue({
      from: mockFrom,
    } as unknown as ReturnType<typeof createAdminClient>)

    const res = await revocarSesion('otro-admin-456')
    expect(res).toEqual({
      success: false,
      error: 'No se puede revocar la sesión de otro administrador.',
    })
  })

  it('permite revocar la sesión de un postulante o reclutador', async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({
      data: { rol_usuario: 'POSTULANTE' },
      error: null,
    })
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockUpsert = vi.fn().mockResolvedValue({ error: null })

    const mockFrom = vi.fn((table: string) => {
      if (table === 'usuario') {
        return { select: mockSelect }
      }
      if (table === 'sesion_actividad') {
        return { upsert: mockUpsert }
      }
      return {}
    })

    vi.mocked(createAdminClient).mockReturnValue({
      from: mockFrom,
    } as unknown as ReturnType<typeof createAdminClient>)

    const res = await revocarSesion('postulante-789')
    expect(res).toEqual({
      success: true,
      data: undefined,
    })
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        usuario_id: 'postulante-789',
        revocada: true,
      })
    )
  })
})
