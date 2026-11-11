import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reactivarPostulante, desactivarPostulante } from './actions'
import { requireAdmin } from '@/lib/guards'
import { createAdminClient } from '@/lib/supabase/server-admin'

vi.mock('@/lib/guards', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/supabase/server-admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('Moderación de postulantes por admin (H-230)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAdmin).mockResolvedValue({
      id: 'admin-1',
      email: 'admin@miliors.com',
      rol: 'ADMIN',
    })
  })

  describe('desactivarPostulante (bloquear)', () => {
    it('devuelve error si el postulante no fue encontrado (0 filas)', async () => {
      const mockSelect = vi.fn().mockResolvedValue({ data: [], error: null })
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate })

      vi.mocked(createAdminClient).mockReturnValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof createAdminClient>)

      const res = await desactivarPostulante('inexistente')
      expect(res).toEqual({
        success: false,
        error: 'Postulante no encontrado.',
      })
      expect(mockFrom).toHaveBeenCalledWith('perfil_postulante')
      expect(mockUpdate).toHaveBeenCalledWith({ bloqueado_por_admin: true })
      expect(mockUpdate).not.toHaveBeenCalledWith(expect.objectContaining({ perfil_en_busqueda: expect.anything() }))
      expect(mockEq).toHaveBeenCalledWith('id', 'inexistente')
      expect(mockSelect).toHaveBeenCalledWith('id')
    })

    it('bloquea correctamente sin tocar perfil_en_busqueda cuando existe el postulante', async () => {
      const mockSelect = vi.fn().mockResolvedValue({ data: [{ id: 'postulante-1' }], error: null })
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate })

      vi.mocked(createAdminClient).mockReturnValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof createAdminClient>)

      const res = await desactivarPostulante('postulante-1')
      expect(res).toEqual({ success: true, data: undefined })
      expect(mockFrom).toHaveBeenCalledWith('perfil_postulante')
      expect(mockUpdate).toHaveBeenCalledWith({ bloqueado_por_admin: true })
      expect(mockUpdate).not.toHaveBeenCalledWith(expect.objectContaining({ perfil_en_busqueda: expect.anything() }))
      expect(mockEq).toHaveBeenCalledWith('id', 'postulante-1')
    })
  })

  describe('reactivarPostulante (desbloquear)', () => {
    it('devuelve error si el postulante no fue encontrado (0 filas)', async () => {
      const mockSelect = vi.fn().mockResolvedValue({ data: [], error: null })
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate })

      vi.mocked(createAdminClient).mockReturnValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof createAdminClient>)

      const res = await reactivarPostulante('inexistente')
      expect(res).toEqual({
        success: false,
        error: 'Postulante no encontrado.',
      })
      expect(mockFrom).toHaveBeenCalledWith('perfil_postulante')
      expect(mockUpdate).toHaveBeenCalledWith({ bloqueado_por_admin: false })
      expect(mockUpdate).not.toHaveBeenCalledWith(expect.objectContaining({ perfil_en_busqueda: expect.anything() }))
      expect(mockEq).toHaveBeenCalledWith('id', 'inexistente')
      expect(mockSelect).toHaveBeenCalledWith('id')
    })

    it('desbloquea correctamente sin tocar perfil_en_busqueda y sin exigir requisitos', async () => {
      const mockSelect = vi.fn().mockResolvedValue({ data: [{ id: 'postulante-1' }], error: null })
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate })

      vi.mocked(createAdminClient).mockReturnValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof createAdminClient>)

      const res = await reactivarPostulante('postulante-1')
      expect(res).toEqual({ success: true, data: undefined })
      expect(mockFrom).toHaveBeenCalledWith('perfil_postulante')
      expect(mockUpdate).toHaveBeenCalledWith({ bloqueado_por_admin: false })
      expect(mockUpdate).not.toHaveBeenCalledWith(expect.objectContaining({ perfil_en_busqueda: expect.anything() }))
      expect(mockEq).toHaveBeenCalledWith('id', 'postulante-1')
    })
  })
})
