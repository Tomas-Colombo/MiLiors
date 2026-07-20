import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { buildSintesisPrompts, buildTriagePrompts, type SintesisPromptContext, type TriageContext } from './sintesis-prompt'

/**
 * Las duraciones y la antigüedad se calculan acá y el LLM tiene prohibido
 * recalcularlas: las cita textual en el certificado. Un error de cálculo se
 * convierte en una afirmación falsa firmada digitalmente, así que se testean.
 */

// 'Actualidad' y las duraciones de puestos vigentes dependen de hoy.
beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-07-16T12:00:00Z'))
})
afterAll(() => {
  vi.useRealTimers()
})

function ctx(overrides: Partial<SintesisPromptContext> = {}): SintesisPromptContext {
  return {
    nombre: 'Ana Pérez',
    objetivo: 'Analista de datos',
    subtitulo: null,
    descripcionPersonalidad: 'Perfil analítico.',
    talentos: [],
    competenciasDestacadas: [],
    comoTrabaja: [],
    competenciasTecnicas: ['SQL'],
    formaciones: [],
    experiencias: [],
    idiomas: [],
    ...overrides,
  }
}

describe('buildSintesisPrompts — experiencia', () => {
  it('formatea período y duración ya calculada de un puesto cerrado', () => {
    const { userPrompt } = buildSintesisPrompts(
      ctx({
        experiencias: [
          { id: 'e1', puesto: 'Analista', empresa: 'Acme', fechaInicio: '2021-03-01', fechaFin: '2024-07-01', descripcion: null },
        ],
      }),
    )
    expect(userPrompt).toContain('Analista en Acme · mar 2021 — jul 2024 (3 años 4 meses)')
  })

  it('marca el puesto vigente y calcula su duración contra hoy', () => {
    const { userPrompt } = buildSintesisPrompts(
      ctx({
        experiencias: [
          { id: 'e1', puesto: 'Dev', empresa: 'Globex', fechaInicio: '2025-01-01', fechaFin: null, descripcion: 'Backend' },
        ],
      }),
    )
    expect(userPrompt).toContain('Dev en Globex · ene 2025 — Actualidad (1 año 6 meses) [PUESTO ACTUAL]')
    expect(userPrompt).toContain('Tareas: Backend')
  })

  it('singulariza año y mes', () => {
    const { userPrompt } = buildSintesisPrompts(
      ctx({
        experiencias: [
          { id: 'e1', puesto: 'Jr', empresa: 'Initech', fechaInicio: '2020-01-01', fechaFin: '2021-02-01', descripcion: null },
        ],
      }),
    )
    expect(userPrompt).toContain('(1 año 1 mes)')
  })
})

describe('buildSintesisPrompts — antigüedad total', () => {
  it('suma períodos consecutivos', () => {
    const { userPrompt } = buildSintesisPrompts(
      ctx({
        experiencias: [
          { id: 'e1', puesto: 'A', empresa: 'X', fechaInicio: '2020-01-01', fechaFin: '2022-01-01', descripcion: null },
          { id: 'e2', puesto: 'B', empresa: 'Y', fechaInicio: '2022-01-01', fechaFin: '2023-01-01', descripcion: null },
        ],
      }),
    )
    expect(userPrompt).toContain('citala, no la recalcules): 3 años')
  })

  it('cuenta los períodos solapados una sola vez', () => {
    // Dos puestos en paralelo entre 2020 y 2022 son 2 años de antigüedad, no 4.
    const { userPrompt } = buildSintesisPrompts(
      ctx({
        experiencias: [
          { id: 'e1', puesto: 'A', empresa: 'X', fechaInicio: '2020-01-01', fechaFin: '2022-01-01', descripcion: null },
          { id: 'e2', puesto: 'B', empresa: 'Y', fechaInicio: '2020-06-01', fechaFin: '2022-01-01', descripcion: null },
        ],
      }),
    )
    expect(userPrompt).toContain('citala, no la recalcules): 2 años\n')
  })

  it('sin experiencia cargada no inventa una cifra', () => {
    const { userPrompt } = buildSintesisPrompts(ctx({ experiencias: [] }))
    expect(userPrompt).toContain('citala, no la recalcules): sin experiencia cargada')
    expect(userPrompt).toContain('(sin experiencia cargada)')
  })
})

describe('buildSintesisPrompts — material que antes no llegaba al prompt', () => {
  it('incluye formación, idiomas y el objetivo declarado', () => {
    const { userPrompt } = buildSintesisPrompts(
      ctx({
        objetivo: 'Ingeniería en Sistemas',
        formaciones: [
          { id: 'f1', titulo: 'Lic. en Sistemas', institucion: 'UBA', fechaGraduacion: '2020-12-01' },
          { id: 'f2', titulo: 'Posgrado en Datos', institucion: 'UTN', fechaGraduacion: null },
        ],
        idiomas: [{ nombre: 'Inglés', nivel: 'Avanzado' }],
      }),
    )
    expect(userPrompt).toContain('Qué estudió / qué busca (EL EJE')
    expect(userPrompt).toContain('Ingeniería en Sistemas')
    expect(userPrompt).toContain('Lic. en Sistemas — UBA · dic 2020')
    expect(userPrompt).toContain('Posgrado en Datos — UTN · en curso o sin fecha')
    expect(userPrompt).toContain('Inglés: Avanzado')
  })

  it('usa el primer nombre y exige tercera persona', () => {
    const { systemPrompt } = buildSintesisPrompts(ctx({ nombre: 'Ana Pérez' }))
    expect(systemPrompt).toContain('"Ana combina..."')
    expect(systemPrompt).toContain('TERCERA PERSONA')
  })
})

function triageCtx(overrides: Partial<TriageContext> = {}): TriageContext {
  return {
    objetivo: 'Desarrollador de software',
    competenciasTecnicas: [],
    formaciones: [],
    experiencias: [],
    ...overrides,
  }
}

describe('buildTriagePrompts', () => {
  it('usa el id exacto entre corchetes como clave de formación y experiencia', () => {
    const { userPrompt } = buildTriagePrompts(
      triageCtx({
        formaciones: [{ id: 'form-123', titulo: 'Piloto comercial', institucion: 'Escuela de Aviación', fechaGraduacion: null }],
        experiencias: [
          { id: 'exp-456', puesto: 'Piloto', empresa: 'Aerolíneas', fechaInicio: '2018-01-01', fechaFin: '2020-01-01', descripcion: null },
        ],
      }),
    )
    expect(userPrompt).toContain('[form-123] Piloto comercial — Escuela de Aviación')
    expect(userPrompt).toContain('[exp-456] Piloto en Aerolíneas')
    expect(userPrompt).toContain('BÚSQUEDA DECLARADA: Desarrollador de software')
  })

  it('usa el nombre de la competencia como su propia clave', () => {
    const { userPrompt } = buildTriagePrompts(triageCtx({ competenciasTecnicas: ['React'] }))
    expect(userPrompt).toContain('[React] React')
  })

  it('exige conservar ante la duda y devolver solo la lista de descartes', () => {
    const { systemPrompt } = buildTriagePrompts(triageCtx())
    expect(systemPrompt).toContain('ANTE LA DUDA, CONSERVÁ')
    expect(systemPrompt).toContain('"descartar"')
  })
})
