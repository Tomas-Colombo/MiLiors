import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generarInformeSeleccion } from './service'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { getReclutadorId } from '@/modules/empresas/queries'
import { cargarContextoCandidato } from './contexto-candidato'
import { aiProvider } from '@/lib/ai'
import { AIError } from '@/lib/ai/port'

vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server-admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/modules/empresas/queries', () => ({
  getReclutadorId: vi.fn(),
}))

vi.mock('./contexto-candidato', () => ({
  cargarContextoCandidato: vi.fn(),
}))

vi.mock('@/lib/ai', () => ({
  aiProvider: {
    generate: vi.fn(),
  },
}))

describe('seleccion/service — generarInformeSeleccion (H-221, H-227)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifySession).mockResolvedValue({ id: 'user-1' } as never)
    vi.mocked(getReclutadorId).mockResolvedValue('rec-1')

    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  titulo_puesto: 'Dev Frontend',
                  descripcion_texto: 'Puesto',
                  carga_horaria: 'Full time',
                  ubicacion: 'Remoto',
                  nivel_experiencia: 'Senior',
                  puesto_criterio_psicologico: null,
                },
              }),
            }),
          }),
        }),
      }),
    } as never)

    const mockAdminFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'postulacion') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ postulante_id: 'c1' }],
              }),
            }),
          }),
        }
      }
      if (table === 'informe_seleccion_generado') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'inf-gen-1' }, error: null }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
      return {}
    })
    vi.mocked(createAdminClient).mockReturnValue({ from: mockAdminFrom } as never)

    vi.mocked(cargarContextoCandidato).mockResolvedValue({
      nombre: 'Lucía Gómez',
      eneatipoNumero: 3,
      eneatipoNombre: 'El Triunfador',
      competencias: ['React', 'TypeScript'],
      formaciones: [],
      experiencias: [],
      informePersonalidad: null,
      notasPrivadas: [],
    })
  })

  // ─── Control de cuota (H-221) ─────────────────────────────────────────────
  it('bloquea con 429 antes de invocar a la IA y sin insertar fila si se superó la cuota', async () => {
    const mockInsert = vi.fn()
    const mockAdminFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'postulacion') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [{ postulante_id: 'c1' }] }),
            }),
          }),
        }
      }
      if (table === 'informe_seleccion_generado') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ count: 5, error: null }),
            }),
          }),
          insert: mockInsert,
        }
      }
      return {}
    })
    vi.mocked(createAdminClient).mockReturnValue({ from: mockAdminFrom } as never)

    const res = await generarInformeSeleccion('puesto-1', ['c1'])
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.status).toBe(429)
      expect(res.error).toContain('5 por hora')
    }
    expect(aiProvider.generate).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('falla con 503 si el conteo de cuota da error de base de datos', async () => {
    const mockAdminFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'postulacion') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [{ postulante_id: 'c1' }] }),
            }),
          }),
        }
      }
      if (table === 'informe_seleccion_generado') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ count: null, error: { message: 'db error' } }),
            }),
          }),
        }
      }
      return {}
    })
    vi.mocked(createAdminClient).mockReturnValue({ from: mockAdminFrom } as never)

    const res = await generarInformeSeleccion('puesto-1', ['c1'])
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.status).toBe(503)
      expect(res.error).toBe('No se pudo verificar el límite de informes. Intentá más tarde.')
    }
    expect(aiProvider.generate).not.toHaveBeenCalled()
  })

  it('falla con 503 y no llama a la IA si falla la inserción del registro', async () => {
    const mockAdminFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'postulacion') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [{ postulante_id: 'c1' }] }),
            }),
          }),
        }
      }
      if (table === 'informe_seleccion_generado') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: { message: 'db insert error' } }),
            }),
          }),
        }
      }
      return {}
    })
    vi.mocked(createAdminClient).mockReturnValue({ from: mockAdminFrom } as never)

    const res = await generarInformeSeleccion('puesto-1', ['c1'])
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.status).toBe(503)
      expect(res.error).toBe('No se pudo verificar el límite de informes. Intentá más tarde.')
    }
    expect(aiProvider.generate).not.toHaveBeenCalled()
  })

  it('camino feliz: inserta fila con GENERANDO y actualiza a LISTO con tokens', async () => {
    const validJSON = JSON.stringify({
      resumenEjecutivo: 'Resumen ok.',
      ranking: [{ posicion: 1, nombre: 'Lucía Gómez', compatibilidad: 'Alta', formacion: 'Ing', estado: 'Recomendada' }],
      justificaciones: [{ posicion: 1, nombre: 'Lucía Gómez', subtitulo: 'Rec', texto: 'Ok' }],
      menosRelevantes: [],
    })

    const insertSpy = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 'inf-123' }, error: null }),
      }),
    })
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    const mockAdminFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'postulacion') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [{ postulante_id: 'c1' }] }),
            }),
          }),
        }
      }
      if (table === 'informe_seleccion_generado') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          }),
          insert: insertSpy,
          update: updateSpy,
        }
      }
      return {}
    })
    vi.mocked(createAdminClient).mockReturnValue({ from: mockAdminFrom } as never)

    vi.mocked(aiProvider.generate).mockResolvedValueOnce({
      content: validJSON,
      usage: { inputTokens: 450, outputTokens: 180 },
      model: 'gemini-2.5-flash',
    })

    const res = await generarInformeSeleccion('puesto-1', ['c1'])
    expect(res.success).toBe(true)

    expect(insertSpy).toHaveBeenCalledWith({
      reclutador_id: 'rec-1',
      puesto_id: 'puesto-1',
      cantidad_candidatos: 1,
      estado: 'GENERANDO',
    })

    expect(updateSpy).toHaveBeenCalledWith({
      estado: 'LISTO',
      tokens_entrada: 450,
      tokens_salida: 180,
    })
  })

  it('si la IA falla, actualiza la fila a ERROR', async () => {
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    })

    const mockAdminFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'postulacion') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [{ postulante_id: 'c1' }] }),
            }),
          }),
        }
      }
      if (table === 'informe_seleccion_generado') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ count: 0, error: null }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'inf-999' }, error: null }),
            }),
          }),
          update: updateSpy,
        }
      }
      return {}
    })
    vi.mocked(createAdminClient).mockReturnValue({ from: mockAdminFrom } as never)

    vi.mocked(aiProvider.generate).mockRejectedValue(
      new AIError('configuracion', false, 'Falta api key')
    )

    const res = await generarInformeSeleccion('puesto-1', ['c1'])
    expect(res.success).toBe(false)
    expect(updateSpy).toHaveBeenCalledWith({
      estado: 'ERROR',
    })
  })

  // ─── Timeouts y reintentos (H-227) ────────────────────────────────────────
  it('llama a aiProvider con timeoutMs: 120_000 y devuelve el informe en el primer intento', async () => {
    const validJSON = JSON.stringify({
      resumenEjecutivo: 'Resumen ejecutivo de prueba.',
      ranking: [
        {
          posicion: 1,
          nombre: 'Lucía Gómez',
          compatibilidad: 'Alta',
          formacion: 'Ingeniería',
          estado: 'Recomendada',
        },
      ],
      justificaciones: [
        {
          posicion: 1,
          nombre: 'Lucía Gómez',
          subtitulo: 'Recomendada',
          texto: 'Excelente perfil.',
        },
      ],
      menosRelevantes: [],
    })

    vi.mocked(aiProvider.generate).mockResolvedValueOnce({
      content: validJSON,
      usage: { inputTokens: 500, outputTokens: 200 },
      model: 'gemini-2.5-flash',
    })

    const res = await generarInformeSeleccion('puesto-1', ['c1'])
    expect(res.success).toBe(true)
    expect(aiProvider.generate).toHaveBeenCalledTimes(1)
    expect(aiProvider.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        timeoutMs: 120_000,
        responseFormat: 'json',
      })
    )
  })

  it('reintenta una sola vez si el primer intento falla con un error transitorio (tiempo_agotado)', async () => {
    const validJSON = JSON.stringify({
      resumenEjecutivo: 'Resumen tras reintento.',
      ranking: [
        {
          posicion: 1,
          nombre: 'Lucía Gómez',
          compatibilidad: 'Alta',
          formacion: 'Ingeniería',
          estado: 'Recomendada',
        },
      ],
      justificaciones: [
        {
          posicion: 1,
          nombre: 'Lucía Gómez',
          subtitulo: 'Recomendada',
          texto: 'Excelente perfil.',
        },
      ],
      menosRelevantes: [],
    })

    vi.mocked(aiProvider.generate)
      .mockRejectedValueOnce(new AIError('tiempo_agotado', true, 'Tiempo de espera agotado (120000ms).'))
      .mockResolvedValueOnce({
        content: validJSON,
        usage: { inputTokens: 500, outputTokens: 200 },
        model: 'gemini-2.5-flash',
      })

    const res = await generarInformeSeleccion('puesto-1', ['c1'])
    expect(res.success).toBe(true)
    expect(aiProvider.generate).toHaveBeenCalledTimes(2)
  })

  it('no reintenta si el error no es transitorio (ej: configuracion)', async () => {
    vi.mocked(aiProvider.generate).mockRejectedValueOnce(
      new AIError('configuracion', false, 'GEMINI_API_KEY is not set')
    )

    const res = await generarInformeSeleccion('puesto-1', ['c1'])
    expect(res.success).toBe(false)
    expect(aiProvider.generate).toHaveBeenCalledTimes(1)
  })

  it('falla tras 2 intentos si ambos fallan con error transitorio', async () => {
    vi.mocked(aiProvider.generate)
      .mockRejectedValueOnce(new AIError('sobrecargado', true, '503 UNAVAILABLE'))
      .mockRejectedValueOnce(new AIError('sobrecargado', true, '503 UNAVAILABLE'))

    const res = await generarInformeSeleccion('puesto-1', ['c1'])
    expect(res.success).toBe(false)
    expect(aiProvider.generate).toHaveBeenCalledTimes(2)
  })
})
