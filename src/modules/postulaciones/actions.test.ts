import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  avanzarEstadoPostulacion,
  revertirDescarte,
  marcarPostulacion,
  noAvanzarPostulacion,
} from './actions'
import { getReclutadorId } from '@/modules/empresas/queries'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { marcarActividadPuesto } from '@/modules/puestos/actividad'
import { revalidatePath } from 'next/cache'
import { ESTADO_POSTULACION, MARCA_POSTULACION } from '@/lib/constants/enums'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/modules/empresas/queries', () => ({
  getReclutadorId: vi.fn(),
}))

vi.mock('@/lib/supabase/server-admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/modules/puestos/actividad', () => ({
  marcarActividadPuesto: vi.fn(),
}))

describe('postulaciones/actions — transiciones y máquina de estados (H-203, H-214)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getReclutadorId).mockResolvedValue('reclutador-1')
  })

  function setupPostulacionMock({
    estado = ESTADO_POSTULACION.ENVIADA,
    cicloAbierto = true,
    updateResult = [{ id: 'post-1' }] as { id: string }[],
    insertResult = { error: null },
  }: {
    estado?: string
    cicloAbierto?: boolean
    updateResult?: { id: string }[]
    insertResult?: { error: unknown }
  } = {}) {
    const updateSpy = vi.fn()
    const insertSpy = vi.fn().mockResolvedValue(insertResult)

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'postulacion') {
        return {
          select: vi.fn().mockImplementation((fields: string) => {
            if (fields.includes('historial_puesto_id')) {
              return {
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    maybeSingle: vi.fn().mockResolvedValue({
                      data: {
                        id: 'post-1',
                        estado,
                        puesto_id: 'puesto-1',
                        postulante_id: 'postulante-1',
                        historial_puesto_id: 'ciclo-1',
                        puesto: {
                          reclutador_id: 'reclutador-1',
                          titulo_puesto: 'Desarrollador',
                        },
                      },
                      error: null,
                    }),
                  }),
                }),
              }
            }
            return {}
          }),
          update: vi.fn().mockImplementation((payload) => {
            updateSpy(payload)
            return {
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockResolvedValue({ data: updateResult, error: null }),
                }),
                in: vi.fn().mockReturnValue({
                  select: vi.fn().mockResolvedValue({ data: updateResult, error: null }),
                }),
                select: vi.fn().mockResolvedValue({ data: updateResult, error: null }),
              }),
            }
          }),
        }
      }

      if (table === 'historial_puesto') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { fecha_fin: cicloAbierto ? null : '2026-05-01T00:00:00Z' },
                error: null,
              }),
            }),
          }),
        }
      }

      if (table === 'nota_privada') {
        return {
          insert: insertSpy,
        }
      }

      return {}
    })

    vi.mocked(createAdminClient).mockReturnValue({
      from: mockFrom,
    } as unknown as ReturnType<typeof createAdminClient>)

    return { updateSpy, insertSpy }
  }

  it('no se reabre una postulación CERRADA en ninguna de las acciones', async () => {
    setupPostulacionMock({ estado: ESTADO_POSTULACION.CERRADA })

    const resAvanzar = await avanzarEstadoPostulacion('post-1')
    expect(resAvanzar).toEqual({
      success: false,
      error: 'El estado actual de la postulación no permite este cambio.',
    })

    const resRevertir = await revertirDescarte('post-1')
    expect(resRevertir).toEqual({
      success: false,
      error: 'El estado actual de la postulación no permite este cambio.',
    })

    const resMarcar = await marcarPostulacion('post-1', MARCA_POSTULACION.AVANZA)
    expect(resMarcar).toEqual({
      success: false,
      error: 'El estado actual de la postulación no permite este cambio.',
    })

    const resNoAvanzar = await noAvanzarPostulacion('post-1', 'motivo prueba')
    expect(resNoAvanzar).toEqual({
      success: false,
      error: 'El estado actual de la postulación no permite este cambio.',
    })

    expect(marcarActividadPuesto).not.toHaveBeenCalled()
  })

  it('no se revierte un descarte de un ciclo cerrado', async () => {
    setupPostulacionMock({
      estado: ESTADO_POSTULACION.PROCESO_FINALIZADO,
      cicloAbierto: false,
    })

    const res = await revertirDescarte('post-1')
    expect(res).toEqual({
      success: false,
      error: 'Esta postulación pertenece a un ciclo del puesto que ya terminó.',
    })
    expect(marcarActividadPuesto).not.toHaveBeenCalled()
  })

  it('una transición rechazada no inserta nota ni marca actividad', async () => {
    const { insertSpy } = setupPostulacionMock({
      estado: ESTADO_POSTULACION.PROCESO_FINALIZADO,
    })

    // Intentar noAvanzar sobre una postulación que ya no avanza (PROCESO_FINALIZADO)
    const res = await noAvanzarPostulacion('post-1', 'motivo no avanzar')
    expect(res).toEqual({
      success: false,
      error: 'El estado actual de la postulación no permite este cambio.',
    })

    expect(insertSpy).not.toHaveBeenCalled()
    expect(marcarActividadPuesto).not.toHaveBeenCalled()
  })

  it('VISTO repetido es idempotente y devuelve success sin escribir en base ni marcar actividad', async () => {
    const { updateSpy } = setupPostulacionMock({
      estado: ESTADO_POSTULACION.VISTO,
      cicloAbierto: true,
    })

    const res = await avanzarEstadoPostulacion('post-1')
    expect(res).toEqual({ success: true, data: undefined })
    expect(updateSpy).not.toHaveBeenCalled()
    expect(marcarActividadPuesto).not.toHaveBeenCalled()
  })

  it('un update con 0 filas devuelve error de estado y revalida las vistas', async () => {
    setupPostulacionMock({
      estado: ESTADO_POSTULACION.ENVIADA,
      cicloAbierto: true,
      updateResult: [], // 0 filas actualizadas
    })

    const res = await avanzarEstadoPostulacion('post-1')
    expect(res).toEqual({
      success: false,
      error: 'El estado actual de la postulación no permite este cambio.',
    })

    expect(revalidatePath).toHaveBeenCalledWith('/reclutador/postulaciones')
    expect(revalidatePath).toHaveBeenCalledWith('/postulante/postulaciones')
    expect(revalidatePath).toHaveBeenCalledWith('/reclutador/postulantes/postulante-1')
    expect(marcarActividadPuesto).not.toHaveBeenCalled()
  })
})
