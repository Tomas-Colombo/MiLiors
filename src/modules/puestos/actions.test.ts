import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  reactivarPuesto,
  cerrarPuesto,
  eliminarPuesto,
  getPostulantesDePuesto,
  contarPostulacionesDelUltimoCiclo,
} from './actions'
import { getReclutadorId } from '@/modules/empresas/queries'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { revalidatePath } from 'next/cache'
import { getCicloMasReciente } from './ciclos'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/modules/empresas/queries', () => ({
  getReclutadorId: vi.fn(),
}))

vi.mock('@/lib/supabase/server-admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('./ciclos', () => ({
  getCicloMasReciente: vi.fn(),
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
    expect(revalidatePath).toHaveBeenCalledWith('/reclutador/puestos/puesto-1')
    expect(revalidatePath).toHaveBeenCalledWith('/reclutador/postulaciones')
    expect(revalidatePath).toHaveBeenCalledWith('/postulante/puestos')
    expect(revalidatePath).toHaveBeenCalledWith('/postulante/postulaciones')
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

describe('puestos/actions — cascadas de cierre y eliminación (H-210)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('cerrarPuesto falla y permite reintentar si falla historial_puesto, sin modificar puesto', async () => {
    vi.mocked(getReclutadorId).mockResolvedValueOnce('rec-1')

    const updatePuesto = vi.fn()
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'puesto') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'puesto-1' } }),
              }),
            }),
          }),
          update: updatePuesto,
        }
      }
      if (table === 'historial_puesto') {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockResolvedValue({ error: { message: 'db error' } }),
            }),
          }),
        }
      }
      return {}
    })

    vi.mocked(createAdminClient).mockReturnValue({ from: mockFrom } as unknown as ReturnType<typeof createAdminClient>)

    const res = await cerrarPuesto('puesto-1')
    expect(res.success).toBe(false)
    expect(res.error).toContain('reintentar')
    // El puesto NO debe haber sido desactivado antes de que la cascada termine
    expect(updatePuesto).not.toHaveBeenCalled()
  })

  it('cerrarPuesto completa la cascada en orden: historial -> postulacion -> puesto', async () => {
    vi.mocked(getReclutadorId).mockResolvedValueOnce('rec-1')

    const callOrder: string[] = []

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'puesto') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'puesto-1' } }),
              }),
            }),
          }),
          update: vi.fn().mockImplementation(() => {
            callOrder.push('puesto.update')
            return {
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }
          }),
        }
      }
      if (table === 'historial_puesto') {
        return {
          update: vi.fn().mockImplementation(() => {
            callOrder.push('historial_puesto.update')
            return {
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockResolvedValue({ error: null }),
              }),
            }
          }),
        }
      }
      if (table === 'postulacion') {
        return {
          update: vi.fn().mockImplementation(() => {
            callOrder.push('postulacion.update')
            return {
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({ error: null }),
              }),
            }
          }),
        }
      }
      return {}
    })

    vi.mocked(createAdminClient).mockReturnValue({ from: mockFrom } as unknown as ReturnType<typeof createAdminClient>)

    const res = await cerrarPuesto('puesto-1')
    expect(res).toEqual({ success: true, data: undefined })
    expect(callOrder).toEqual(['historial_puesto.update', 'postulacion.update', 'puesto.update'])
  })

  it('eliminarPuesto completa la cascada antes de marcar fecha_baja_puesto', async () => {
    vi.mocked(getReclutadorId).mockResolvedValueOnce('rec-1')

    const callOrder: string[] = []

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'puesto') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'puesto-1' } }),
              }),
            }),
          }),
          update: vi.fn().mockImplementation(() => {
            callOrder.push('puesto.baja')
            return {
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }
          }),
        }
      }
      if (table === 'historial_puesto') {
        return {
          update: vi.fn().mockImplementation(() => {
            callOrder.push('historial_puesto.update')
            return {
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockResolvedValue({ error: null }),
              }),
            }
          }),
        }
      }
      if (table === 'postulacion') {
        return {
          update: vi.fn().mockImplementation(() => {
            callOrder.push('postulacion.update')
            return {
              eq: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({ error: null }),
              }),
            }
          }),
        }
      }
      return {}
    })

    vi.mocked(createAdminClient).mockReturnValue({ from: mockFrom } as unknown as ReturnType<typeof createAdminClient>)

    const res = await eliminarPuesto('puesto-1')
    expect(res).toEqual({ success: true, data: undefined })
    expect(callOrder).toEqual(['historial_puesto.update', 'postulacion.update', 'puesto.baja'])
  })
})

describe('puestos/actions — lecturas del modal como ActionResult (H-105)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getPostulantesDePuesto devuelve error si no está autorizado', async () => {
    vi.mocked(getReclutadorId).mockResolvedValueOnce(null)
    const res = await getPostulantesDePuesto('puesto-1')
    expect(res).toEqual({ success: false, error: 'No autorizado.' })
  })

  it('getPostulantesDePuesto devuelve postulantes únicos del último ciclo', async () => {
    vi.mocked(getReclutadorId).mockResolvedValueOnce('rec-1')
    vi.mocked(getCicloMasReciente).mockResolvedValueOnce('ciclo-1')

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'puesto') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'puesto-1' } }),
              }),
            }),
          }),
        }
      }
      if (table === 'postulacion') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  { postulante_id: 'post-1', perfil_postulante: { nombre_completo: 'Ana Pérez' } },
                  { postulante_id: 'post-1', perfil_postulante: { nombre_completo: 'Ana Pérez' } },
                  { postulante_id: 'post-2', perfil_postulante: null },
                ],
                error: null,
              }),
            }),
          }),
        }
      }
      return {}
    })

    vi.mocked(createAdminClient).mockReturnValue({ from: mockFrom } as unknown as ReturnType<typeof createAdminClient>)

    const res = await getPostulantesDePuesto('puesto-1')
    expect(res).toEqual({
      success: true,
      data: [
        { postulanteId: 'post-1', nombre: 'Ana Pérez' },
        { postulanteId: 'post-2', nombre: 'Sin nombre' },
      ],
    })
  })

  it('contarPostulacionesDelUltimoCiclo devuelve error si el puesto no es propio', async () => {
    vi.mocked(getReclutadorId).mockResolvedValueOnce('rec-1')

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'puesto') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        }
      }
      return {}
    })

    vi.mocked(createAdminClient).mockReturnValue({ from: mockFrom } as unknown as ReturnType<typeof createAdminClient>)

    const res = await contarPostulacionesDelUltimoCiclo('puesto-1')
    expect(res).toEqual({ success: false, error: 'No autorizado.' })
  })

  it('contarPostulacionesDelUltimoCiclo devuelve el conteo exacto del ciclo', async () => {
    vi.mocked(getReclutadorId).mockResolvedValueOnce('rec-1')
    vi.mocked(getCicloMasReciente).mockResolvedValueOnce('ciclo-1')

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'puesto') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'puesto-1' }, error: null }),
              }),
            }),
          }),
        }
      }
      if (table === 'postulacion') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
          }),
        }
      }
      return {}
    })

    vi.mocked(createAdminClient).mockReturnValue({ from: mockFrom } as unknown as ReturnType<typeof createAdminClient>)

    const res = await contarPostulacionesDelUltimoCiclo('puesto-1')
    expect(res).toEqual({ success: true, data: 5 })
  })
})
