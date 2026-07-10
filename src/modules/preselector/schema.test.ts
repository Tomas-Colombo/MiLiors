import { describe, it, expect } from 'vitest'
import {
  preguntaPreselectorInputSchema,
  formularioPreselectorInputSchema,
  respuestasPreselectorInputSchema,
  parseFormularioPreselectorField,
} from './schema'

const opcion = (texto: string, esValida = false) => ({ texto, esValida })

const preguntaOpciones = (overrides: Partial<{
  texto: string
  esCritica: boolean
  opciones: { texto: string; esValida: boolean }[]
}> = {}) => ({
  texto: overrides.texto ?? 'Pregunta de prueba',
  tipo: 'OPCIONES' as const,
  esCritica: overrides.esCritica ?? false,
  opciones: overrides.opciones ?? [opcion('Sí', true), opcion('No', false)],
})

const preguntaTextoLibre = (overrides: Partial<{ texto: string }> = {}) => ({
  texto: overrides.texto ?? 'Contanos tu experiencia',
  tipo: 'TEXTO_LIBRE' as const,
  esCritica: false,
})

describe('preguntaPreselectorInputSchema', () => {
  it('acepta una pregunta de opciones no crítica con 2 opciones', () => {
    const parsed = preguntaPreselectorInputSchema.safeParse(preguntaOpciones())
    expect(parsed.success).toBe(true)
  })

  it('acepta una pregunta de texto libre sin opciones', () => {
    const parsed = preguntaPreselectorInputSchema.safeParse(preguntaTextoLibre())
    expect(parsed.success).toBe(true)
  })

  it('rechaza una pregunta de opciones con menos de 2 opciones', () => {
    const parsed = preguntaPreselectorInputSchema.safeParse(
      preguntaOpciones({ opciones: [opcion('Única', true)] })
    )
    expect(parsed.success).toBe(false)
  })

  it('rechaza una pregunta de opciones sin opciones', () => {
    const parsed = preguntaPreselectorInputSchema.safeParse(
      preguntaOpciones({ opciones: [] })
    )
    expect(parsed.success).toBe(false)
  })

  it('rechaza una pregunta crítica de tipo texto libre', () => {
    const parsed = preguntaPreselectorInputSchema.safeParse({
      ...preguntaTextoLibre(),
      esCritica: true,
    })
    expect(parsed.success).toBe(false)
  })

  it('rechaza una pregunta crítica de opciones sin ninguna opción válida', () => {
    const parsed = preguntaPreselectorInputSchema.safeParse(
      preguntaOpciones({
        esCritica: true,
        opciones: [opcion('Sí', false), opcion('No', false)],
      })
    )
    expect(parsed.success).toBe(false)
  })

  it('acepta una pregunta crítica de opciones con al menos una opción válida', () => {
    const parsed = preguntaPreselectorInputSchema.safeParse(
      preguntaOpciones({
        esCritica: true,
        opciones: [opcion('Sí', true), opcion('No', false)],
      })
    )
    expect(parsed.success).toBe(true)
  })

  it('rechaza texto vacío', () => {
    const parsed = preguntaPreselectorInputSchema.safeParse(
      preguntaTextoLibre({ texto: '' })
    )
    expect(parsed.success).toBe(false)
  })
})

describe('formularioPreselectorInputSchema', () => {
  it('acepta un formulario con 10 preguntas', () => {
    const preguntas = Array.from({ length: 10 }, (_, i) => preguntaTextoLibre({ texto: `Pregunta ${i}` }))
    const parsed = formularioPreselectorInputSchema.safeParse({ preguntas })
    expect(parsed.success).toBe(true)
  })

  it('rechaza un formulario con 11 preguntas (límite de 10)', () => {
    const preguntas = Array.from({ length: 11 }, (_, i) => preguntaTextoLibre({ texto: `Pregunta ${i}` }))
    const parsed = formularioPreselectorInputSchema.safeParse({ preguntas })
    expect(parsed.success).toBe(false)
  })

  it('rechaza un formulario sin preguntas', () => {
    const parsed = formularioPreselectorInputSchema.safeParse({ preguntas: [] })
    expect(parsed.success).toBe(false)
  })
})

describe('respuestasPreselectorInputSchema', () => {
  const uuid1 = '11111111-1111-4111-8111-111111111111'
  const uuid2 = '22222222-2222-4222-8222-222222222222'

  it('acepta una respuesta con solo opcionId', () => {
    const parsed = respuestasPreselectorInputSchema.safeParse([
      { preguntaId: uuid1, opcionId: uuid2 },
    ])
    expect(parsed.success).toBe(true)
  })

  it('acepta una respuesta con solo textoLibre', () => {
    const parsed = respuestasPreselectorInputSchema.safeParse([
      { preguntaId: uuid1, textoLibre: 'Mi respuesta' },
    ])
    expect(parsed.success).toBe(true)
  })

  it('rechaza una respuesta sin opcionId ni textoLibre', () => {
    const parsed = respuestasPreselectorInputSchema.safeParse([
      { preguntaId: uuid1 },
    ])
    expect(parsed.success).toBe(false)
  })

  it('rechaza una respuesta con ambos opcionId y textoLibre', () => {
    const parsed = respuestasPreselectorInputSchema.safeParse([
      { preguntaId: uuid1, opcionId: uuid2, textoLibre: 'Ambos' },
    ])
    expect(parsed.success).toBe(false)
  })
})

describe('parseFormularioPreselectorField', () => {
  it('trata null como ausente', () => {
    const result = parseFormularioPreselectorField(null)
    expect(result.kind).toBe('absent')
  })

  it('trata la cadena vacía como "eliminar formulario"', () => {
    const result = parseFormularioPreselectorField('')
    expect(result.kind).toBe('empty')
  })

  it('rechaza JSON inválido', () => {
    const result = parseFormularioPreselectorField('{no es json')
    expect(result.kind).toBe('invalid')
  })

  it('rechaza un formulario que no cumple el schema', () => {
    const result = parseFormularioPreselectorField(JSON.stringify({ preguntas: [] }))
    expect(result.kind).toBe('invalid')
  })

  it('parsea un formulario válido', () => {
    const raw = JSON.stringify({
      preguntas: [preguntaTextoLibre()],
    })
    const result = parseFormularioPreselectorField(raw)
    expect(result.kind).toBe('valid')
    if (result.kind === 'valid') {
      expect(result.data.preguntas).toHaveLength(1)
    }
  })
})
