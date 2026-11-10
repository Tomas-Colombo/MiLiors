import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reactivarPostulante, desactivarPostulante } from './actions'
import { getRequisitosVisibilidadPostulante } from './queries'
import { requireAdmin } from '@/lib/guards'
import { createAdminClient } from '@/lib/supabase/server-admin'

vi.mock('@/lib/guards', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/supabase/server-admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('./queries', () => ({
  getRequisitosVisibilidadPostulante: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('Moderación de visibilidad de postulante desde admin (H-215)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAdmin).mockResolvedValue({
      id: 'admin-1',
      email: 'admin@miliors.com',
      rol: 'ADMIN',
    })
  })

  describe('reactivarPostulante', () => {
    it('rechaza reactivar si no cumple las precondiciones de visibilidad', async () => {
      vi.mocked(getRequisitosVisibilidadPostulante).mockResolvedValueOnce({
        existePerfil: true,
        tieneDominante: false,
        informeListo: true,
      })

      const res = await reactivarPostulante('postulante-1')
      expect(res).toEqual({
        success: false,
        error: 'No se puede reactivar: el postulante no completó el test de personalidad.',
      })
      expect(createAdminClient).not.toHaveBeenCalled()
    })

    it('no confunde un error de lectura con un requisito incumplido', async () => {
      vi.mocked(getRequisitosVisibilidadPostulante).mockRejectedValueOnce(new Error('timeout'))
      vi.spyOn(console, 'error').mockImplementation(() => {})

      const res = await reactivarPostulante('postulante-1')
      expect(res).toEqual({ success: false, error: 'No se pudo reactivar el perfil.' })
      expect(createAdminClient).not.toHaveBeenCalled()
    })

    it('reactiva el perfil si cumple los requisitos', async () => {
      vi.mocked(getRequisitosVisibilidadPostulante).mockResolvedValueOnce({
        existePerfil: true,
        tieneDominante: true,
        informeListo: true,
      })

      const mockEq = vi.fn().mockResolvedValue({ error: null })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate })

      vi.mocked(createAdminClient).mockReturnValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof createAdminClient>)

      const res = await reactivarPostulante('postulante-1')
      expect(res).toEqual({ success: true, data: undefined })
      expect(mockFrom).toHaveBeenCalledWith('perfil_postulante')
      expect(mockUpdate).toHaveBeenCalledWith({ perfil_en_busqueda: true })
      expect(mockEq).toHaveBeenCalledWith('id', 'postulante-1')
    })
  })

  describe('desactivarPostulante', () => {
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
      expect(mockUpdate).toHaveBeenCalledWith({ perfil_en_busqueda: false })
      expect(mockSelect).toHaveBeenCalledWith('id')
    })

    it('desactiva correctamente cuando existe el postulante', async () => {
      const mockSelect = vi.fn().mockResolvedValue({ data: [{ id: 'postulante-1' }], error: null })
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate })

      vi.mocked(createAdminClient).mockReturnValue({
        from: mockFrom,
      } as unknown as ReturnType<typeof createAdminClient>)

      const res = await desactivarPostulante('postulante-1')
      expect(res).toEqual({ success: true, data: undefined })
    })
  })
})
