import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reactivarPuesto } from './actions'
import { getReclutadorId } from '@/modules/empresas/queries'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { revalidatePath } from 'next/cache'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/modules/empresas/queries', () => ({
  getReclutadorId: vi.fn(),
}))

vi.mock('@/lib/supabase/server-admin', () => ({
  createAdminClient: vi.fn(),
}))

describe('puestos/actions — reactivarPuesto (H-204)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('devuelve error si el usuario no es un reclutador autenticado', async () => {
    vi.mocked(getReclutadorId).mockResolvedValueOnce(null)
    const res = await reactivarPuesto('puesto-1')
    expect(res).toEqual({ success: false, error: 'No autorizado.' })
  })

  it('devuelve error si el puesto fue eliminado con fecha_baja_puesto', async () => {
    vi.mocked(getReclutadorId).mockResolvedValueOnce('rec-1')

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'puesto') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    empresa_id: 'emp-1',
                    fecha_baja_puesto: '2026-05-01T12:00:00Z',
                    empresa: { fecha_baja: null },
                  },
                }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockReturnValue({
                    select: vi.fn().mockResolvedValue({
                      data: [],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }
      }
      return {}
    })

    vi.mocked(createAdminClient).mockReturnValue({ from: mockFrom } as unknown as ReturnType<typeof createAdminClient>)

    const res = await reactivarPuesto('puesto-1')
    expect(res).toEqual({ success: false, error: 'Un puesto eliminado no se puede reactivar.' })
  })

  it('reactiva un puesto cerrado y abre un nuevo ciclo en historial_puesto', async () => {
    vi.mocked(getReclutadorId).mockResolvedValueOnce('rec-1')

    const insertHistorial = vi.fn().mockResolvedValue({ error: null })
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'puesto') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    empresa_id: 'emp-1',
                    fecha_baja_puesto: null,
                    empresa: { fecha_baja: null },
                  },
                }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockReturnValue({
                    select: vi.fn().mockResolvedValue({
                      data: [{ titulo_puesto: 'Frontend Dev' }],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'historial_puesto') {
        return {
          insert: insertHistorial,
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ data: [] }),
            }),
          }),
        }
      }
      return {}
    })

    vi.mocked(createAdminClient).mockReturnValue({ from: mockFrom } as unknown as ReturnType<typeof createAdminClient>)

    const res = await reactivarPuesto('puesto-1')
    expect(res).toEqual({ success: true, data: undefined })
    expect(insertHistorial).toHaveBeenCalledWith(
      expect.objectContaining({
        puesto_id: 'puesto-1',
      })
    )
    expect(revalidatePath).toHaveBeenCalledWith('/reclutador/puestos')
  })

  it('mantiene la reactivación idempotente si el puesto ya estaba activo', async () => {
    vi.mocked(getReclutadorId).mockResolvedValueOnce('rec-1')

    const insertHistorial = vi.fn()
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'puesto') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    empresa_id: 'emp-1',
                    fecha_baja_puesto: null,
                    empresa: { fecha_baja: null },
                  },
                }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockReturnValue({
                    select: vi.fn().mockResolvedValue({
                      data: [], // 0 filas actualizadas porque activo ya era true
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'historial_puesto') {
        return {
          insert: insertHistorial,
        }
      }
      return {}
    })

    vi.mocked(createAdminClient).mockReturnValue({ from: mockFrom } as unknown as ReturnType<typeof createAdminClient>)

    const res = await reactivarPuesto('puesto-1')
    expect(res).toEqual({ success: true, data: undefined })
    // No abre un segundo ciclo si ya estaba activo
    expect(insertHistorial).not.toHaveBeenCalled()
  })
})
