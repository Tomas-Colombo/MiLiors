import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { buildSintesisPrompts, buildTriagePrompts, type SintesisPromptContext, type TriageContext } from './sintesis-prompt'

/**
 * Las duraciones se calculan acá y el LLM tiene prohibido recalcularlas. No las
 * cita —el párrafo del certificado no lleva fechas—, pero de ellas depende el
 * tono: si deduce mal el recorrido, describe como junior a alguien con veinte
 * años de oficio. Por eso se testean.
 *
 * Y se testea también que el user prompt no le pida lo que el system prompt le
 * prohíbe: esa contradicción estuvo viva en tres líneas del prompt.
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
    competenciasDestacadas: [],
    comoTrabaja: [],
    competenciasTecnicas: ['SQL'],
    formaciones: [],
    cursos: [],
    experiencias: [],
    idiomas: [],
    personalidadPublica: true,
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

describe('buildSintesisPrompts — el dato temporal es contexto, no material a citar', () => {
  it('no manda una antigüedad total: era una cifra que sólo servía para citarla', () => {
    const { userPrompt } = buildSintesisPrompts(
      ctx({
        experiencias: [
          { id: 'e1', puesto: 'A', empresa: 'X', fechaInicio: '2020-01-01', fechaFin: '2022-01-01', descripcion: null },
          { id: 'e2', puesto: 'B', empresa: 'Y', fechaInicio: '2022-01-01', fechaFin: '2023-01-01', descripcion: null },
        ],
      }),
    )
    expect(userPrompt).not.toContain('Antigüedad')
    expect(userPrompt).not.toContain('NUNCA la cites')
  })

  it('no le ordena citar las duraciones que el system prompt le prohíbe escribir', () => {
    const { systemPrompt, userPrompt } = buildSintesisPrompts(
      ctx({
        experiencias: [
          { id: 'e1', puesto: 'A', empresa: 'X', fechaInicio: '2020-01-01', fechaFin: '2022-01-01', descripcion: null },
        ],
        cursos: [{ id: 'c1', nombre: 'SQL', institucion: 'Coursera', fechaFin: '2024-03-01' }],
      }),
    )
    // El system prompt prohíbe fechas y duraciones en el párrafo...
    expect(systemPrompt).toContain('PROHIBIDO EN ESE PÁRRAFO: fechas, años, duraciones')
    // ...así que el user prompt no puede pedir lo contrario.
    expect(userPrompt).not.toContain('citalas tal cual')
    expect(userPrompt).not.toContain('copiala tal cual')
    expect(userPrompt).not.toContain('ya vienen calculadas')
    // El período sí se manda: es lo único que ubica el recorrido.
    expect(userPrompt).toContain('(2 años)')
    expect(userPrompt).toContain('NO las escribas en el')
  })

  it('no manda las horas de los cursos: no hay forma de usarlas sin citarlas', () => {
    const { userPrompt } = buildSintesisPrompts(
      ctx({ cursos: [{ id: 'c1', nombre: 'SQL', institucion: 'Coursera', fechaFin: '2024-03-01' }] }),
    )
    expect(userPrompt).toContain('SQL — Coursera · [FINALIZADO] · mar 2024')
    // Sin "40 h" colgando del ítem.
    expect(userPrompt).not.toMatch(/\d+\s*h\b/)
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
    // Fecha de graduación ya cumplida → título obtenido; sin fecha → en curso.
    expect(userPrompt).toContain('Lic. en Sistemas — UBA · [TÍTULO OBTENIDO] · graduado en dic 2020')
    expect(userPrompt).toContain('Posgrado en Datos — UTN · [EN CURSO] · sin fecha de graduación')
    expect(userPrompt).toContain('Inglés: Avanzado')
  })

  it('invita a escanear el QR solo si el informe es público', () => {
    const publico = buildSintesisPrompts(ctx({ personalidadPublica: true })).systemPrompt
    expect(publico).toContain('CIERRE: terminá el párrafo con')
    expect(publico).toContain('código QR')

    // Informe oculto: prometer un QR que no lo muestra sería falso en un documento firmado.
    const privado = buildSintesisPrompts(ctx({ personalidadPublica: false })).systemPrompt
    expect(privado).not.toContain('CIERRE: terminá el párrafo con')
    expect(privado).not.toContain('código QR')
  })

  it('prohibe datos duros en el párrafo que se imprime', () => {
    const { systemPrompt } = buildSintesisPrompts(ctx())
    expect(systemPrompt).toContain('QUÉ ESCRIBÍS')
    expect(systemPrompt).toContain('PROHIBIDO EN ESE PÁRRAFO')
  })

  it('pide un solo párrafo y ninguna clave extra', () => {
    const { systemPrompt } = buildSintesisPrompts(ctx())
    expect(systemPrompt).toContain('UN SOLO párrafo de 4 a 6 oraciones')
    expect(systemPrompt).toContain('No agregues ninguna otra clave al JSON')
    // Pausadas: no se piden más al LLM (ninguna vista las renderizaba).
    expect(systemPrompt).not.toContain('"fortalezas"')
    expect(systemPrompt).not.toContain('"contextoIdeal"')
    expect(systemPrompt).not.toContain('"competenciasIntegradas"')
  })

  it('no le pide integrar las competencias técnicas por nombre exacto', () => {
    // El JSON de salida no tiene dónde reportar cuáles integró, y el párrafo no
    // las enumera: pedirlo era un resto del esquema anterior.
    const { userPrompt } = buildSintesisPrompts(ctx({ competenciasTecnicas: ['SQL', 'Python'] }))
    expect(userPrompt).not.toContain('integrá por nombre EXACTO')
    expect(userPrompt).toContain('no para enumerarlas')
    // El listado sí llega: es lo que le dice en qué terreno se mueve.
    expect(userPrompt).toContain('  - SQL')
    expect(userPrompt).toContain('  - Python')
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
    cursos: [],
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
