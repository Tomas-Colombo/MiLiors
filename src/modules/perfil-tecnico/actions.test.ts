import { describe, it, expect, vi, beforeEach } from 'vitest'
import { guardarCompetenciasConCustom } from './actions'
import { getPostulanteId } from '@/modules/perfil/queries'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/modules/perfil/queries', () => ({
  getPostulanteId: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server-admin', () => ({
  createAdminClient: vi.fn(),
}))

describe('perfil-tecnico/actions — guardarCompetenciasConCustom (H-205)', () => {
  let mockSupabase: {
    from: ReturnType<typeof vi.fn>
  }
  let mockAdmin: {
    from: ReturnType<typeof vi.fn>
  }

  const mockPerfilTecnicoId = 'pt-123'
  const mockPostulanteId = 'post-123'

  let postulanteCompetenciaInserts: unknown[]
  let competenciaSugeridaUpserts: unknown[]
  let competenciaSugeridaDeletes: unknown[]

  beforeEach(() => {
    vi.clearAllMocks()
    postulanteCompetenciaInserts = []
    competenciaSugeridaUpserts = []
    competenciaSugeridaDeletes = []

    vi.mocked(getPostulanteId).mockResolvedValue(mockPostulanteId)

    mockAdmin = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'certificado_pdf') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }
        }
        throw new Error(`createAdminClient no debe ser llamado para la tabla '${table}'`)
      }),
    }
    vi.mocked(createAdminClient).mockReturnValue(mockAdmin as unknown as ReturnType<typeof createAdminClient>)

    mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'perfil_tecnico') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: mockPerfilTecnicoId }, error: null }),
              }),
            }),
          }
        }

        if (table === 'competencia') {
          return {
            select: vi.fn().mockReturnValue({
              is: vi.fn().mockImplementation((col: string, val: unknown) => {
                if (col === 'fecha_baja' && val === null) {
                  // Catálogo activo: contiene "Inglés" y "React".
                  // "Cobol" está dada de baja (no figura acá).
                  return Promise.resolve({
                    data: [
                      { id: 'cat-ingles', nombre: 'Inglés' },
                      { id: 'cat-react', nombre: 'React' },
                    ],
                    error: null,
                  })
                }
                return Promise.resolve({ data: [], error: null })
              }),
              in: vi.fn().mockImplementation((_col: string, ids: string[]) => {
                const catalog = [
                  { id: 'cat-ingles', nombre: 'Inglés' },
                  { id: 'cat-react', nombre: 'React' },
                ]
                return Promise.resolve({
                  data: catalog.filter((c) => ids.includes(c.id)),
                  error: null,
                })
              }),
            }),
          }
        }

        if (table === 'competencia_sugerida') {
          return {
            upsert: vi.fn().mockImplementation((rows: unknown[]) => {
              competenciaSugeridaUpserts.push(...rows)
              return Promise.resolve({ error: null })
            }),
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue(
                Promise.resolve({ data: [], error: null })
              ),
            }),
            delete: vi.fn().mockReturnValue({
              in: vi.fn().mockImplementation((_col: string, ids: string[]) => {
                competenciaSugeridaDeletes.push(...ids)
                return Promise.resolve({ error: null })
              }),
            }),
          }
        }

        if (table === 'postulante_competencia') {
          return {
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation(() => {
                return Promise.resolve({ error: null })
              }),
            }),
            insert: vi.fn().mockImplementation((rows: unknown[]) => {
              postulanteCompetenciaInserts.push(...rows)
              return Promise.resolve({ error: null })
            }),
          }
        }

        return {}
      }),
    }
    vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as Awaited<ReturnType<typeof createClient>>)
  })

  it('un nombre libre que coincide (ignorando tildes y mayúsculas) con una activa se asigna sin crear sugerencia', async () => {
    // "ingles" coincide con "Inglés" del catálogo activo
    const res = await guardarCompetenciasConCustom([], [
      { nombre: 'ingles', nivel: 'AVANZADO' },
    ])

    expect(res.success).toBe(true)
    // Se inserta en postulante_competencia con el id del catálogo y el nivel
    expect(postulanteCompetenciaInserts).toEqual([
      {
        perfil_tecnico_id: mockPerfilTecnicoId,
        competencia_id: 'cat-ingles',
        nivel: 'AVANZADO',
      },
    ])
    // NO se crea sugerencia
    expect(competenciaSugeridaUpserts).toHaveLength(0)
  })

  it('un nombre libre que coincide con una desactivada crea sugerencia', async () => {
    // "Cobol" no está en el catálogo activo (está desactivada)
    const res = await guardarCompetenciasConCustom([], [
      { nombre: 'Cobol', nivel: 'INTERMEDIO' },
    ])

    expect(res.success).toBe(true)
    // No va a postulante_competencia
    expect(postulanteCompetenciaInserts).toHaveLength(0)
    // Va a competencia_sugerida
    expect(competenciaSugeridaUpserts).toEqual([
      {
        perfil_tecnico_id: mockPerfilTecnicoId,
        nombre: 'Cobol',
        nombre_normalizado: 'cobol',
        nivel: 'INTERMEDIO',
      },
    ])
    // Se devuelve en items con pendiente: true
    expect(res.success && res.data.items).toContainEqual({
      id: 'custom:Cobol',
      nombre: 'Cobol',
      nivel: 'INTERMEDIO',
      pendiente: true,
    })
  })

  it('uno nuevo crea sugerencia', async () => {
    // "Rust" es nuevo, no existe en catálogo
    const res = await guardarCompetenciasConCustom([], [
      { nombre: 'Rust', nivel: 'BASICO' },
    ])

    expect(res.success).toBe(true)
    expect(postulanteCompetenciaInserts).toHaveLength(0)
    expect(competenciaSugeridaUpserts).toEqual([
      {
        perfil_tecnico_id: mockPerfilTecnicoId,
        nombre: 'Rust',
        nombre_normalizado: 'rust',
        nivel: 'BASICO',
      },
    ])
    expect(res.success && res.data.items).toContainEqual({
      id: 'custom:Rust',
      nombre: 'Rust',
      nivel: 'BASICO',
      pendiente: true,
    })
  })

  it('un nombre inválido devuelve error', async () => {
    // Nombre vacío o solo espacios
    const resVacio = await guardarCompetenciasConCustom([], [
      { nombre: '   ', nivel: 'BASICO' },
    ])
    expect(resVacio.success).toBe(false)
    if (!resVacio.success) {
      expect(resVacio.error).toBeDefined()
    }

    // Nombre que supera 120 caracteres
    const resLargo = await guardarCompetenciasConCustom([], [
      { nombre: 'A'.repeat(121), nivel: 'BASICO' },
    ])
    expect(resLargo.success).toBe(false)
    if (!resLargo.success) {
      expect(resLargo.error).toContain('120')
    }
  })

  it('no se usa createAdminClient para competencia', async () => {
    await guardarCompetenciasConCustom(
      [{ id: 'cat-react', nivel: 'AVANZADO' }],
      [{ nombre: 'Python', nivel: 'INTERMEDIO' }]
    )

    // Se verifica que createAdminClient nunca fue llamado para 'competencia'
    const adminCalls = mockAdmin.from.mock.calls
    const competenciaCalls = adminCalls.filter((args: unknown[]) => args[0] === 'competencia')
    expect(competenciaCalls).toHaveLength(0)
  })
})
