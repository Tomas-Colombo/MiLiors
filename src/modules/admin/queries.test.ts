import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getRequisitosVisibilidadPostulante } from './queries'
import { createAdminClient } from '@/lib/supabase/server-admin'

vi.mock('@/lib/supabase/server-admin', () => ({
  createAdminClient: vi.fn(),
}))

describe('getRequisitosVisibilidadPostulante', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devuelve todo en false si el perfil no existe', async () => {
    const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

    vi.mocked(createAdminClient).mockReturnValue({
      from: mockFrom,
    } as unknown as ReturnType<typeof createAdminClient>)

    const res = await getRequisitosVisibilidadPostulante('post-inexistente')
    expect(res).toEqual({
      existePerfil: false,
      tieneDominante: false,
      informeListo: false,
    })
    expect(mockFrom).toHaveBeenCalledWith('perfil_postulante')
  })

  it('evalúa correctamente dominantes e informe cuando existe el perfil', async () => {
    const mockFrom = vi.fn((table: string) => {
      if (table === 'perfil_postulante') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'post-1' }, error: null }),
            }),
          }),
        }
      }
      if (table === 'test_eneagrama') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'test-1',
                  test_eneagrama_dominante: [{ id: 'dom-1' }],
                },
                error: null,
              }),
            }),
          }),
        }
      }
      if (table === 'informe_personalidad') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'inf-1',
                  estado_informe: 'LISTO',
                },
                error: null,
              }),
            }),
          }),
        }
      }
      return {}
    })

    vi.mocked(createAdminClient).mockReturnValue({
      from: mockFrom,
    } as unknown as ReturnType<typeof createAdminClient>)

    const res = await getRequisitosVisibilidadPostulante('post-1')
    expect(res).toEqual({
      existePerfil: true,
      tieneDominante: true,
      informeListo: true,
    })
  })
})
