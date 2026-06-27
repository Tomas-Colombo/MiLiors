/**
 * notas-view.ts
 *
 * Pure helpers for the recruiter notes aggregation view.
 * Intentionally free of server-only imports — safe to unit-test with Vitest.
 */

import type { NotaReclutador } from './queries'

// Re-export so tests can import the type from this module too
export type { NotaReclutador }

/**
 * Groups an array of recruiter notes by `postulante_id`.
 *
 * Returns a plain object whose keys are candidate UUIDs and whose values
 * are the notes belonging to each candidate, preserving the original order.
 *
 * This is a pure function: same input always produces the same output,
 * with no side effects.
 */
export function groupNotesByCandidate(
  notes: NotaReclutador[]
): Record<string, NotaReclutador[]> {
  const groups: Record<string, NotaReclutador[]> = {}

  for (const note of notes) {
    const key = note.postulante_id
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(note)
  }

  return groups
}
