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

describe('seleccion/service — generarInformeSeleccion timeouts y reintento (H-227)', () => {
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
                  perfil_psicologico_deseado: null,
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
