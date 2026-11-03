import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  evaluarCuotaAsistente,
  consultarAsistente,
} from './actions'

const LIMITE_CONSULTAS_HORA = 20
const LIMITE_CONSULTAS_DIA = 100
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { getReclutadorId } from '@/modules/empresas/queries'
import { cargarContextoCandidato } from '@/modules/seleccion/contexto-candidato'
import { aiProvider } from '@/lib/ai'

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

vi.mock('@/modules/seleccion/contexto-candidato', () => ({
  cargarContextoCandidato: vi.fn(),
}))

vi.mock('@/lib/ai', () => ({
  aiProvider: {
    generate: vi.fn(),
  },
}))

describe('asistente/actions — evaluarCuotaAsistente (H-221)', () => {
  it('permite consultas si los conteos están por debajo de los límites', async () => {
    expect(await evaluarCuotaAsistente(0, 0)).toEqual({ permitida: true })
    expect(await evaluarCuotaAsistente(LIMITE_CONSULTAS_HORA - 1, LIMITE_CONSULTAS_DIA - 1)).toEqual({
      permitida: true,
    })
  })

  it('bloquea cuando se alcanza o supera el límite por hora', async () => {
    const res = await evaluarCuotaAsistente(LIMITE_CONSULTAS_HORA, 50)
    expect(res.permitida).toBe(false)
    if (!res.permitida) {
      expect(res.error).toBe(
        'Alcanzaste el límite de consultas al asistente (20 por hora). Probá de nuevo más tarde.'
      )
    }
  })

  it('bloquea cuando se alcanza o supera el límite por día', async () => {
    const res = await evaluarCuotaAsistente(5, LIMITE_CONSULTAS_DIA)
    expect(res.permitida).toBe(false)
    if (!res.permitida) {
      expect(res.error).toBe(
        'Alcanzaste el límite de consultas al asistente (100 por día). Probá de nuevo más tarde.'
      )
    }
  })
})

describe('asistente/actions — consultarAsistente rate limiting (H-221)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(verifySession).mockResolvedValue({ id: 'user-1' } as never)
    vi.mocked(getReclutadorId).mockResolvedValue('rec-1')
  })

  it('bloquea antes de invocar a la IA si se superó la cuota por hora', async () => {
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  titulo_puesto: 'Dev',
                  descripcion_texto: null,
                  carga_horaria: 'Full',
                  ubicacion: 'Remoto',
                  nivel_experiencia: null,
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
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'post-1' } }),
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'consulta_asistente_ia') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({ count: 20, error: null }),
            }),
          }),
        }
      }
      return {}
    })

    vi.mocked(createAdminClient).mockReturnValue({ from: mockAdminFrom } as never)
    vi.mocked(cargarContextoCandidato).mockResolvedValue({
      nombre: 'Juan',
      eneatipoNumero: null,
      eneatipoNombre: null,
      competencias: [],
      formaciones: [],
      experiencias: [],
      informePersonalidad: null,
      notasPrivadas: [],
    })

    const res = await consultarAsistente('cand-1', 'puesto-1', '¿Cómo rinde?')
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error).toContain('20 por hora')
    }
    expect(aiProvider.generate).not.toHaveBeenCalled()
  })

  it('falla cerrado con mensaje genérico si el conteo de cuota da error de base', async () => {
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  titulo_puesto: 'Dev',
                  descripcion_texto: null,
                  carga_horaria: 'Full',
                  ubicacion: 'Remoto',
                  nivel_experiencia: null,
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
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'post-1' } }),
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'consulta_asistente_ia') {
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
    vi.mocked(cargarContextoCandidato).mockResolvedValue({
      nombre: 'Juan',
      eneatipoNumero: null,
      eneatipoNombre: null,
      competencias: [],
      formaciones: [],
      experiencias: [],
      informePersonalidad: null,
      notasPrivadas: [],
    })

    const res = await consultarAsistente('cand-1', 'puesto-1', '¿Pregunta?')
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error).toBe('No se pudo verificar el límite de consultas. Intentá más tarde.')
    }
    expect(aiProvider.generate).not.toHaveBeenCalled()
  })
})
