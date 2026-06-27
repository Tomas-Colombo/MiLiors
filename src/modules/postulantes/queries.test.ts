import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock server-only so it doesn't throw when imported outside Next.js
vi.mock('server-only', () => ({}))

// Mock React cache — unwrap so the function is called directly in tests
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return {
    ...actual,
    cache: (fn: unknown) => fn,
  }
})

// Mock verifySession with a relative path relative to this test file location:
// this file: src/modules/postulantes/queries.test.ts
// dal:       src/lib/dal.ts  → relative: ../../lib/dal
vi.mock('../../lib/dal', () => ({
  verifySession: vi.fn().mockResolvedValue({ id: 'user-123', email: 'recruiter@test.com' }),
}))

// Mock Supabase server client
// src/lib/supabase/server → relative: ../../lib/supabase/server
vi.mock('../../lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

// Import after all vi.mock hoisted calls
import { createClient } from '../../lib/supabase/server'
import { getTodasLasNotasReclutador } from './queries'

// ─── Supabase chainable builder ───────────────────────────────────────────────

type MockResult = { data: unknown; error: null }

function makeChainableBuilder(result: MockResult) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
  }
}

let reclutadorBuilder: ReturnType<typeof makeChainableBuilder>
let notaBuilder: ReturnType<typeof makeChainableBuilder>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeNoteRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'note-1',
    contenido: 'A private note',
    fecha_creacion: '2026-06-01T10:00:00Z',
    updated_at: '2026-06-01T10:00:00Z',
    puesto_id: null,
    puesto: null,
    perfil_postulante: { id: 'candidate-a', nombre_completo: 'Alice Smith' },
    ...overrides,
  }
}

function setupSupabaseMock(notaData: unknown[]) {
  notaBuilder = makeChainableBuilder({ data: notaData, error: null })
  reclutadorBuilder = makeChainableBuilder({ data: { id: 'reclutador-1' }, error: null })

  vi.mocked(createClient).mockResolvedValue({
    from: vi.fn((table: string) => {
      if (table === 'perfil_reclutador') return reclutadorBuilder
      return notaBuilder
    }),
  } as unknown as Awaited<ReturnType<typeof createClient>>)
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('getTodasLasNotasReclutador', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns all notes across multiple candidates, preserving server order (newest first)', async () => {
    const rows = [
      makeNoteRow({ id: 'note-3', fecha_creacion: '2026-06-03T10:00:00Z', perfil_postulante: { id: 'candidate-c', nombre_completo: 'Carol' } }),
      makeNoteRow({ id: 'note-2', fecha_creacion: '2026-06-02T10:00:00Z', perfil_postulante: { id: 'candidate-b', nombre_completo: 'Bob' } }),
      makeNoteRow({ id: 'note-1', fecha_creacion: '2026-06-01T10:00:00Z', perfil_postulante: { id: 'candidate-a', nombre_completo: 'Alice' } }),
    ]
    setupSupabaseMock(rows)

    const result = await getTodasLasNotasReclutador()

    expect(result).toHaveLength(3)
    // Newest note first — matches the order the mock server returns
    expect(result[0].id).toBe('note-3')
    expect(result[1].id).toBe('note-2')
    expect(result[2].id).toBe('note-1')
    // Maps nombre_completo from perfil_postulante join
    expect(result[0].nombre_completo).toBe('Carol')
    expect(result[1].nombre_completo).toBe('Bob')
    expect(result[2].nombre_completo).toBe('Alice')
  })

  it('returns an empty array when the recruiter has no notes', async () => {
    setupSupabaseMock([])

    const result = await getTodasLasNotasReclutador()

    // Must be empty — not undefined, not null
    expect(result).toHaveLength(0)
    expect(result).toEqual([])
  })

  it('applies candidatoId filter — passes eq to query and returns filtered results', async () => {
    const filteredRows = [
      makeNoteRow({ id: 'note-a1', perfil_postulante: { id: 'candidate-a', nombre_completo: 'Alice' } }),
    ]
    setupSupabaseMock(filteredRows)

    const result = await getTodasLasNotasReclutador({ candidatoId: 'candidate-a' })

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('note-a1')
    expect(result[0].postulante_id).toBe('candidate-a')
    // The eq('postulante_id', ...) call must have been made on the nota builder
    expect(notaBuilder.eq).toHaveBeenCalledWith('postulante_id', 'candidate-a')
  })

  it('returns note with nombre_completo null when candidate row is missing (deleted candidate)', async () => {
    const rows = [
      makeNoteRow({
        id: 'orphan-note',
        perfil_postulante: null,  // LEFT JOIN returns null for deleted candidates
      }),
    ]
    setupSupabaseMock(rows)

    const result = await getTodasLasNotasReclutador()

    expect(result).toHaveLength(1)
    // nombre_completo must be null — not crash
    expect(result[0].nombre_completo).toBeNull()
    // id falls back to empty string when the join is null
    expect(result[0].postulante_id).toBe('')
  })
})
