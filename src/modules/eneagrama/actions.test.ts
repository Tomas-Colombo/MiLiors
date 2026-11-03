import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calcularEneatipo } from './actions'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { revalidatePath } from 'next/cache'
import type { NumeroEneatipo, RespuestaInput } from './calculator'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('next/server', () => ({
  after: vi.fn((_cb: () => void | Promise<void>) => {
    // No ejecutamos after para mantener los tests unitarios aislados
  }),
}))

vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server-admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/modules/informe/actions', () => ({
  generarInforme: vi.fn(),
}))

// ─── Helpers para generar 135 preguntas y respuestas válidas ─────────────────

function respuestasPorTipo(
  eneatipo: NumeroEneatipo,
  total: number,
  offset = 0
): RespuestaInput[] {
  const valores = Array(15).fill(1) as number[]
  let resto = total - 15
  for (let i = 0; i < 15 && resto > 0; i++) {
    const incremento = Math.min(4, resto)
    valores[i] += incremento
    resto -= incremento
  }
  return valores.map((v, i) => ({
    preguntaId: `p_${eneatipo}_${i + 1 + offset}`,
    eneatipoAsociado: eneatipo,
    valorRespondido: v as 1 | 2 | 3 | 4 | 5,
  }))
}

const PUNTAJES_VALIDOS: Record<NumeroEneatipo, number> = {
  1: 50, 2: 42, 3: 50, 4: 41, 5: 49,
  6: 53, 7: 48, 8: 51, 9: 49,
}

const RESPUESTAS_MOCK: RespuestaInput[] = (
  [1, 2, 3, 4, 5, 6, 7, 8, 9] as NumeroEneatipo[]
).flatMap((t, idx) => respuestasPorTipo(t, PUNTAJES_VALIDOS[t], idx * 15))

const PREGUNTAS_ACTIVAS_MOCK = RESPUESTAS_MOCK.map(r => ({
  id: r.preguntaId,
  eneatipo_asociado: r.eneatipoAsociado,
}))

const RESPUESTAS_DB_MOCK = RESPUESTAS_MOCK.map(r => ({
  pregunta_id: r.preguntaId,
  valor_respondido: r.valorRespondido,
  pregunta_eneagrama: { eneatipo_asociado: r.eneatipoAsociado },
}))

describe('calcularEneatipo — H-209 regla de espera de 6 meses', () => {
  // Spies de admin client
  const adminUpdateEq = vi.fn().mockResolvedValue({ error: null })
  const adminUpdate = vi.fn().mockReturnValue({ eq: adminUpdateEq })
  const adminDeleteEq = vi.fn().mockResolvedValue({ error: null })
  const adminDelete = vi.fn().mockReturnValue({ eq: adminDeleteEq })
  const adminInsert = vi.fn().mockResolvedValue({ error: null })
  const adminUpsert = vi.fn().mockResolvedValue({ error: null })

  // Admin client mock
  const adminFrom = vi.fn((tabla: string) => {
    switch (tabla) {
      case 'test_eneagrama':
        return { update: adminUpdate }
      case 'test_eneagrama_dominante':
        return { delete: adminDelete, insert: adminInsert }
      case 'resultado_puntaje_eneagrama':
        return { upsert: adminUpsert }
      case 'informe_personalidad':
        return {
          insert: adminInsert,
          update: adminUpdate,
        }
      case 'certificado_pdf':
        return { update: adminUpdate }
      default:
        return {}
    }
  })

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(verifySession).mockResolvedValue({
      id: 'usr-1',
      email: 'postulante@example.com',
      rol: 'POSTULANTE',
    })

    vi.mocked(createAdminClient).mockReturnValue({
      from: adminFrom,
    } as unknown as ReturnType<typeof createAdminClient>)
  })

  function configurarSupabaseMock({
    vecesCompletado,
    fechaRealizacion,
    informeExistente = null,
  }: {
    vecesCompletado: number | null
    fechaRealizacion: string | null
    informeExistente?: { id: string; estado_informe: string; contenido_json: unknown } | null
  }) {
    const supabaseFrom = vi.fn((tabla: string) => {
      switch (tabla) {
        case 'test_eneagrama':
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'test-1',
                    postulante_id: 'post-1',
                    veces_completado: vecesCompletado,
                    fecha_realizacion: fechaRealizacion,
                  },
                }),
              }),
            }),
          }
        case 'perfil_postulante':
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'post-1' },
                  }),
                }),
              }),
            }),
          }
        case 'pregunta_eneagrama':
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                is: vi.fn().mockResolvedValue({
                  data: PREGUNTAS_ACTIVAS_MOCK,
                  error: null,
                }),
              }),
            }),
          }
        case 'respuesta_item_eneagrama':
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: RESPUESTAS_DB_MOCK,
              }),
            }),
          }
        case 'eneatipo':
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'eneatipo-uuid-6', nombre: 'El Leal' },
                }),
              }),
            }),
          }
        case 'informe_personalidad':
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: informeExistente,
                }),
              }),
            }),
          }
        default:
          return {}
      }
    })

    vi.mocked(createClient).mockResolvedValue({
      from: supabaseFrom,
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    return { supabaseFrom }
  }

  it('veces 0 → calcula exitosamente y persiste el resultado', async () => {
    configurarSupabaseMock({
      vecesCompletado: 0,
      fechaRealizacion: null,
    })

    const resultado = await calcularEneatipo('test-1')

    expect(resultado.success).toBe(true)
    if (resultado.success) {
      expect(resultado.data.eneatipoNumero).toBe(6)
      expect(resultado.data.eneatipoNombre).toBe('El Leal')
    }
    expect(adminUpdate).toHaveBeenCalled()
    expect(adminDelete).toHaveBeenCalled()
    expect(adminInsert).toHaveBeenCalled()
    expect(adminUpsert).toHaveBeenCalled()
    expect(revalidatePath).toHaveBeenCalledWith('/postulante', 'layout')
  })

  it('veces 1 (ajuste inicial) → calcula exitosamente sin exigir espera de 6 meses', async () => {
    // Completado hace apenas 2 días, pero veces_completado === 1 permite ajuste inicial
    const haceDosDias = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    configurarSupabaseMock({
      vecesCompletado: 1,
      fechaRealizacion: haceDosDias,
      informeExistente: {
        id: 'inf-1',
        estado_informe: 'LISTO',
        contenido_json: { version: '2.0' },
      },
    })

    const resultado = await calcularEneatipo('test-1')

    expect(resultado.success).toBe(true)
    if (resultado.success) {
      expect(resultado.data.eneatipoNumero).toBe(6)
    }
    expect(adminUpdate).toHaveBeenCalled()
    expect(adminDelete).toHaveBeenCalled()
    expect(adminInsert).toHaveBeenCalled()
    expect(adminUpsert).toHaveBeenCalled()
  })

  it('veces 2 con fecha de hace 1 mes → error y NINGUNA escritura en la base', async () => {
    const haceUnMes = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { supabaseFrom } = configurarSupabaseMock({
      vecesCompletado: 2,
      fechaRealizacion: haceUnMes,
    })

    const resultado = await calcularEneatipo('test-1')

    expect(resultado.success).toBe(false)
    if (!resultado.success) {
      expect(resultado.error).toMatch(/^Vas a poder rehacer el Eneagrama a partir del \d{2}\/\d{2}\/\d{4}\.$/)
    }

    // NINGUNA operación de escritura fue ejecutada
    expect(adminUpdate).not.toHaveBeenCalled()
    expect(adminDelete).not.toHaveBeenCalled()
    expect(adminInsert).not.toHaveBeenCalled()
    expect(adminUpsert).not.toHaveBeenCalled()

    // Tampoco se cargaron preguntas ni respuestas
    expect(supabaseFrom).not.toHaveBeenCalledWith('pregunta_eneagrama')
    expect(supabaseFrom).not.toHaveBeenCalledWith('respuesta_item_eneagrama')
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('veces 2 con fecha de hace 7 meses → calcula exitosamente al haber cumplido la espera', async () => {
    // 7 meses atrás ≈ 210 días
    const haceSieteMeses = new Date(Date.now() - 210 * 24 * 60 * 60 * 1000).toISOString()
    configurarSupabaseMock({
      vecesCompletado: 2,
      fechaRealizacion: haceSieteMeses,
      informeExistente: {
        id: 'inf-1',
        estado_informe: 'LISTO',
        contenido_json: { version: '2.0' },
      },
    })

    const resultado = await calcularEneatipo('test-1')

    expect(resultado.success).toBe(true)
    if (resultado.success) {
      expect(resultado.data.eneatipoNumero).toBe(6)
      expect(resultado.data.eneatipoNombre).toBe('El Leal')
    }
    expect(adminUpdate).toHaveBeenCalled()
    expect(adminDelete).toHaveBeenCalled()
    expect(adminInsert).toHaveBeenCalled()
    expect(adminUpsert).toHaveBeenCalled()
  })
})
