import { describe, it, expect } from 'vitest'
import { groupNotesByCandidate, type NotaReclutador } from './notas-view'

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeNote(overrides: Partial<NotaReclutador> = {}): NotaReclutador {
  return {
    id: 'note-1',
    contenido: 'Test note content',
    fecha_creacion: '2026-06-01T10:00:00Z',
    updated_at: '2026-06-01T10:00:00Z',
    puesto_id: null,
    titulo_puesto: null,
    postulante_id: 'candidate-a',
    nombre_completo: 'Candidate A',
    ...overrides,
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('groupNotesByCandidate', () => {
  it('returns an empty object when called with an empty array', () => {
    const result = groupNotesByCandidate([])

    // Result must be an empty object — production code ran and produced it
    expect(Object.keys(result)).toHaveLength(0)
    expect(result).toEqual({})
  })

  it('groups multiple notes for the same candidate under one key', () => {
    const notes: NotaReclutador[] = [
      makeNote({ id: 'note-1', postulante_id: 'candidate-a', contenido: 'First note' }),
      makeNote({ id: 'note-2', postulante_id: 'candidate-a', contenido: 'Second note' }),
      makeNote({ id: 'note-3', postulante_id: 'candidate-a', contenido: 'Third note' }),
    ]

    const result = groupNotesByCandidate(notes)

    // One key for candidate-a
    expect(Object.keys(result)).toHaveLength(1)
    expect(result['candidate-a']).toHaveLength(3)
    // Verify all notes are present and ordered as-is
    expect(result['candidate-a'][0].id).toBe('note-1')
    expect(result['candidate-a'][1].id).toBe('note-2')
    expect(result['candidate-a'][2].id).toBe('note-3')
  })

  it('creates separate keys for notes belonging to different candidates', () => {
    const notes: NotaReclutador[] = [
      makeNote({ id: 'note-1', postulante_id: 'candidate-a', nombre_completo: 'Alice' }),
      makeNote({ id: 'note-2', postulante_id: 'candidate-b', nombre_completo: 'Bob' }),
      makeNote({ id: 'note-3', postulante_id: 'candidate-a', nombre_completo: 'Alice' }),
      makeNote({ id: 'note-4', postulante_id: 'candidate-c', nombre_completo: 'Carol' }),
    ]

    const result = groupNotesByCandidate(notes)

    // Three distinct candidate keys
    expect(Object.keys(result)).toHaveLength(3)
    expect(result['candidate-a']).toHaveLength(2)
    expect(result['candidate-b']).toHaveLength(1)
    expect(result['candidate-c']).toHaveLength(1)

    // Verify the correct notes are in each group
    expect(result['candidate-a'].map((n) => n.id)).toEqual(['note-1', 'note-3'])
    expect(result['candidate-b'][0].id).toBe('note-2')
    expect(result['candidate-c'][0].id).toBe('note-4')
  })

  it('handles notes with null nombre_completo (deleted candidates) without crashing', () => {
    const notes: NotaReclutador[] = [
      makeNote({ id: 'note-1', postulante_id: 'deleted-candidate', nombre_completo: null }),
      makeNote({ id: 'note-2', postulante_id: 'deleted-candidate', nombre_completo: null }),
    ]

    const result = groupNotesByCandidate(notes)

    expect(Object.keys(result)).toHaveLength(1)
    expect(result['deleted-candidate']).toHaveLength(2)
    // Null nombre_completo is preserved — caller handles display fallback
    expect(result['deleted-candidate'][0].nombre_completo).toBeNull()
  })
})
