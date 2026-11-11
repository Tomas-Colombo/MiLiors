import { describe, it, expect, vi, beforeEach } from 'vitest'
import { aprobarSugerencia, descartarSugerencia } from './actions'
import { requireAdmin } from '@/lib/guards'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { logAuditoria } from '@/lib/logger'
import { marcarCertificadosDesactualizados } from '@/modules/perfil-tecnico/certificado'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/guards', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/supabase/server-admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logAuditoria: vi.fn(),
}))

vi.mock('@/modules/perfil-tecnico/certificado', () => ({
  marcarCertificadosDesactualizados: vi.fn(),
}))

describe('admin/actions — moderación de sugerencias (H-205)', () => {
  let mockAdmin: {
    from: ReturnType<typeof vi.fn>
  }

  let competenciaInserts: unknown[]
  let competenciaUpdates: unknown[]
  let postulanteCompetenciaUpserts: unknown[]
  let competenciaSugeridaDeletes: string[]

  const mockAdminSession = {
    id: 'admin-user-id',
    email: 'admin@test.com',
    rol: 'ADMIN',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    competenciaInserts = []
    competenciaUpdates = []
    postulanteCompetenciaUpserts = []
    competenciaSugeridaDeletes = []

    vi.mocked(requireAdmin).mockResolvedValue(mockAdminSession as unknown as Awaited<ReturnType<typeof requireAdmin>>)
  })

  function setupMockAdmin({
    sugerencias = [] as { id: string; perfil_tecnico_id: string; nombre: string; nivel: string }[],
    catalogo = [] as { id: string; nombre: string; fecha_baja: string | null }[],
    perfilTecnicos = [] as { id: string; postulante_id: string }[],
  } = {}) {
    mockAdmin = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'competencia_sugerida') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((_col: string, _val: string) => {
                return Promise.resolve({
                  data: sugerencias,
                  error: null,
                })
              }),
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockImplementation((_col: string, val: string) => {
                competenciaSugeridaDeletes.push(val)
                return Promise.resolve({ error: null })
              }),
              in: vi.fn().mockImplementation((_col: string, ids: string[]) => {
                competenciaSugeridaDeletes.push(...ids)
                return Promise.resolve({ error: null })
              }),
            }),
          }
        }

        if (table === 'competencia') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
              then: (resolve: (val: unknown) => void) =>
                resolve({
                  data: catalogo,
                  error: null,
                }),
            }),
            insert: vi.fn().mockImplementation((payload: unknown) => {
              competenciaInserts.push(payload)
              return {
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'nueva-competencia-uuid' },
                    error: null,
                  }),
                }),
              }
            }),
            update: vi.fn().mockImplementation((payload: unknown) => {
              competenciaUpdates.push(payload)
              return {
                eq: vi.fn().mockResolvedValue({ error: null }),
              }
            }),
          }
        }

        if (table === 'postulante_competencia') {
          return {
            upsert: vi.fn().mockImplementation((rows: unknown[]) => {
              postulanteCompetenciaUpserts.push(...rows)
              return Promise.resolve({ error: null })
            }),
          }
        }

        if (table === 'perfil_tecnico') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockImplementation((_col: string, ids: string[]) => {
                return Promise.resolve({
                  data: perfilTecnicos.filter((pt) => ids.includes(pt.id)),
                  error: null,
                })
              }),
            }),
          }
        }

        return {}
      }),
    }

    vi.mocked(createAdminClient).mockReturnValue(mockAdmin as unknown as ReturnType<typeof createAdminClient>)
  }

  describe('aprobarSugerencia', () => {
    it('sin coincidencia, crea la competencia en el catálogo, asigna a todos los postulantes del grupo con su nivel y borra el grupo', async () => {
      const sugerencias = [
        { id: 'sug-1', perfil_tecnico_id: 'pt-1', nombre: 'Docker', nivel: 'AVANZADO' },
        { id: 'sug-2', perfil_tecnico_id: 'pt-2', nombre: 'Docker', nivel: 'BASICO' },
      ]
      const perfilTecnicos = [
        { id: 'pt-1', postulante_id: 'post-1' },
        { id: 'pt-2', postulante_id: 'post-2' },
      ]

      setupMockAdmin({ sugerencias, catalogo: [], perfilTecnicos })

      const res = await aprobarSugerencia('docker')

      expect(res.success).toBe(true)
      // 1. Crea la competencia con el nombre representativo
      expect(competenciaInserts).toEqual([{ nombre: 'Docker' }])
      // 2. Asigna a todos los postulantes del grupo con su nivel
      expect(postulanteCompetenciaUpserts).toEqual([
        {
          perfil_tecnico_id: 'pt-1',
          competencia_id: 'nueva-competencia-uuid',
          nivel: 'AVANZADO',
        },
        {
          perfil_tecnico_id: 'pt-2',
          competencia_id: 'nueva-competencia-uuid',
          nivel: 'BASICO',
        },
      ])
      // 3. Borra el grupo de sugerencias
      expect(competenciaSugeridaDeletes).toEqual(['sug-1', 'sug-2'])
      // 4. Marca los certificados
      expect(marcarCertificadosDesactualizados).toHaveBeenCalledWith(['post-1', 'post-2'])
      // 5. Registra auditoría
      expect(logAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'aprobar_competencia_sugerida',
          entidad: 'competencia_sugerida',
        })
      )
    })

    it('si coincide con una desactivada, la reactiva en vez de crear una nueva', async () => {
      const sugerencias = [
        { id: 'sug-1', perfil_tecnico_id: 'pt-1', nombre: 'cobol', nivel: 'INTERMEDIO' },
      ]
      const catalogo = [
        { id: 'comp-cobol-id', nombre: 'Cobol', fecha_baja: '2026-01-01T00:00:00Z' },
      ]
      const perfilTecnicos = [{ id: 'pt-1', postulante_id: 'post-1' }]

      setupMockAdmin({ sugerencias, catalogo, perfilTecnicos })

      const res = await aprobarSugerencia('cobol')

      expect(res.success).toBe(true)
      // No inserta en competencia
      expect(competenciaInserts).toHaveLength(0)
      // Reactiva la existente (fecha_baja: null)
      expect(competenciaUpdates).toEqual([{ fecha_baja: null }])
      // Asigna al postulante con su nivel
      expect(postulanteCompetenciaUpserts).toEqual([
        {
          perfil_tecnico_id: 'pt-1',
          competencia_id: 'comp-cobol-id',
          nivel: 'INTERMEDIO',
        },
      ])
      // Borra la sugerencia
      expect(competenciaSugeridaDeletes).toEqual(['sug-1'])
    })
  })

  describe('descartarSugerencia', () => {
    it('borra el grupo de sugerencias y registra auditoría', async () => {
      setupMockAdmin()

      const res = await descartarSugerencia('invalida')

      expect(res.success).toBe(true)
      expect(competenciaSugeridaDeletes).toContain('invalida')
      expect(logAuditoria).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'descartar_competencia_sugerida',
          entidad: 'competencia_sugerida',
          detalle: { nombreNormalizado: 'invalida' },
        })
      )
    })
  })
})
