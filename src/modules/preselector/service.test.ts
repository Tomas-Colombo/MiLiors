import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import { persistirFormularioPreselector } from './service'
import type { FormularioPreselectorInput } from './schema'

type Error_ = { message: string } | null
type Respuestas = Partial<Record<string, { data?: unknown; error?: Error_ }>>

/**
 * Cliente mínimo: cada tabla devuelve su respuesta (default OK). Registra todos
 * los `insert` en orden para poder afirmar sobre cantidad y payload.
 */
function makeSupabase(respuestas: Respuestas = {}) {
  const inserts: { tabla: string; payload: unknown }[] = []

  const from = vi.fn((tabla: string) => {
    const resp = respuestas[tabla] ?? {}
    const resultado = { data: resp.data ?? null, error: resp.error ?? null }
    const builder: Record<string, unknown> = {}
    builder.select = vi.fn(() => builder)
    builder.eq = vi.fn(() => builder)
    builder.limit = vi.fn(() => builder)
    // El delete (replace-all) siempre sale bien: la respuesta configurada es la del insert.
    builder.delete = vi.fn(() => ({ eq: () => Promise.resolve({ data: null, error: null }) }))
    builder.single = vi.fn(() => Promise.resolve(resultado))
    builder.insert = vi.fn((payload: unknown) => {
      inserts.push({ tabla, payload })
      return builder
    })
    // `await builder` (sin .single()) resuelve con el resultado de la tabla.
    builder.then = (resolve: (r: typeof resultado) => unknown) => resolve(resultado)
    return builder
  })

  const supabase = { from } as unknown as SupabaseClient<Database>
  return { supabase, inserts }
}

const conFormulario: Respuestas = {
  formulario_preselector: { data: { id: 'form-1' } },
}

const input: FormularioPreselectorInput = {
  preguntas: [
    {
      texto: 'Disponibilidad full time',
      tipo: 'OPCIONES',
      esCritica: true,
      opciones: [
        { texto: 'Sí', esValida: true },
        { texto: 'No', esValida: false },
      ],
    },
    { texto: 'Contanos sobre vos', tipo: 'TEXTO_LIBRE', esCritica: false },
    {
      texto: 'Modalidad',
      tipo: 'OPCIONES',
      esCritica: false,
      opciones: [
        { texto: 'Remoto', esValida: false },
        { texto: 'Híbrido', esValida: false },
        { texto: 'Presencial', esValida: false },
      ],
    },
  ],
}

describe('persistirFormularioPreselector', () => {
  it('inserta preguntas y opciones en un solo insert cada una', async () => {
    const { supabase, inserts } = makeSupabase(conFormulario)

    const res = await persistirFormularioPreselector(supabase, 'puesto-1', input)

    expect(res).toEqual({ ok: true })
    expect(inserts.map((i) => i.tabla)).toEqual([
      'formulario_preselector',
      'pregunta_preselector',
      'opcion_pregunta_preselector',
    ])
  })

  it('mapea preguntas con orden 0-based, es_critica literal e id generado', async () => {
    const { supabase, inserts } = makeSupabase(conFormulario)

    await persistirFormularioPreselector(supabase, 'puesto-1', input)

    const preguntas = inserts[1].payload as Record<string, unknown>[]
    expect(preguntas).toHaveLength(3)
    expect(preguntas.map(({ id: _id, ...resto }) => resto)).toEqual([
      { formulario_id: 'form-1', texto: 'Disponibilidad full time', tipo: 'OPCIONES', es_critica: true, orden: 0 },
      { formulario_id: 'form-1', texto: 'Contanos sobre vos', tipo: 'TEXTO_LIBRE', es_critica: false, orden: 1 },
      { formulario_id: 'form-1', texto: 'Modalidad', tipo: 'OPCIONES', es_critica: false, orden: 2 },
    ])
    const ids = preguntas.map((p) => p.id as string)
    expect(new Set(ids).size).toBe(3)
    for (const id of ids) expect(id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('enlaza las opciones a los ids generados de su pregunta con orden 0-based por pregunta', async () => {
    const { supabase, inserts } = makeSupabase(conFormulario)

    await persistirFormularioPreselector(supabase, 'puesto-1', input)

    const [p0, , p2] = (inserts[1].payload as { id: string }[]).map((p) => p.id)
    expect(inserts[2].payload).toEqual([
      { pregunta_id: p0, texto: 'Sí', es_valida: true, orden: 0 },
      { pregunta_id: p0, texto: 'No', es_valida: false, orden: 1 },
      { pregunta_id: p2, texto: 'Remoto', es_valida: false, orden: 0 },
      { pregunta_id: p2, texto: 'Híbrido', es_valida: false, orden: 1 },
      { pregunta_id: p2, texto: 'Presencial', es_valida: false, orden: 2 },
    ])
  })

  it('no inserta opciones si ninguna pregunta las tiene', async () => {
    const { supabase, inserts } = makeSupabase(conFormulario)

    const res = await persistirFormularioPreselector(supabase, 'puesto-1', {
      preguntas: [{ texto: 'Libre', tipo: 'TEXTO_LIBRE', esCritica: false }],
    })

    expect(res).toEqual({ ok: true })
    expect(inserts.map((i) => i.tabla)).toEqual(['formulario_preselector', 'pregunta_preselector'])
  })

  it('falla con el mismo mensaje si el insert de preguntas falla, sin insertar opciones', async () => {
    const { supabase, inserts } = makeSupabase({
      ...conFormulario,
      pregunta_preselector: { error: { message: 'boom' } },
    })

    const res = await persistirFormularioPreselector(supabase, 'puesto-1', input)

    expect(res).toEqual({ ok: false, error: 'No se pudo guardar una pregunta del formulario.' })
    expect(inserts.map((i) => i.tabla)).not.toContain('opcion_pregunta_preselector')
  })

  it('falla con el mismo mensaje si el insert de opciones falla', async () => {
    const { supabase } = makeSupabase({
      ...conFormulario,
      opcion_pregunta_preselector: { error: { message: 'boom' } },
    })

    const res = await persistirFormularioPreselector(supabase, 'puesto-1', input)

    expect(res).toEqual({ ok: false, error: 'No se pudieron guardar las opciones de una pregunta.' })
  })

  it('falla sin tocar preguntas si no se pudo crear el formulario', async () => {
    const { supabase, inserts } = makeSupabase({ formulario_preselector: { error: { message: 'boom' } } })

    const res = await persistirFormularioPreselector(supabase, 'puesto-1', input)

    expect(res).toEqual({ ok: false, error: 'No se pudo crear el formulario preselector.' })
    expect(inserts.map((i) => i.tabla)).toEqual(['formulario_preselector'])
  })
})
