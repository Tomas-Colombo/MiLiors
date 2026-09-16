import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AIError } from '@/lib/ai/port'
import { SINTESIS_VERSION } from '@/lib/types/certificado'
import type { SintesisContext } from './sintesis-service'

/**
 * Política de fallos de la síntesis del certificado. Son dos llamadas con
 * criterios opuestos a propósito:
 *
 *  - el triage falla ABIERTO (si no se puede filtrar, va todo el material),
 *  - la redacción falla CERRADO (sin prosa no hay síntesis que guardar).
 *
 * Lo que se prueba es eso: cuántas veces se llama y con qué se corta.
 */

const generate = vi.fn()
// Sólo el proveedor se mockea: `AIError` tiene que seguir siendo la clase real,
// porque la decisión de reintentar sale de un `instanceof`.
vi.mock('@/lib/ai', async () => {
  const port = await import('@/lib/ai/port')
  return {
    aiProvider: { generate: (...args: unknown[]) => generate(...args) },
    AIError: port.AIError,
  }
})

const { generarSintesisCertificado } = await import('./sintesis-service')

function ctx(overrides: Partial<SintesisContext> = {}): SintesisContext {
  return {
    nombre: 'Ana Pérez',
    objetivo: 'Analista de datos',
    subtitulo: null,
    descripcionPersonalidad: 'Perfil analítico.',
    competenciasDestacadas: [{ nombre: 'Analítico / numérico', nivel: 'Alto', descripcion: 'Lee datos con soltura.' }],
    comoTrabaja: [],
    competenciasTecnicas: ['SQL'],
    formaciones: [],
    cursos: [],
    experiencias: [],
    idiomas: [],
    personalidadPublica: false,
    ...overrides,
  }
}

function respuesta(content: string) {
  return { content, usage: { inputTokens: 500, outputTokens: 400 }, model: 'gemini-2.5-flash' }
}

const TRIAGE_VACIO = respuesta(JSON.stringify({ descartar: [] }))
const SINTESIS_OK = respuesta(JSON.stringify({ perfilIntegrado: 'Un párrafo de perfil integrado.' }))

const sobrecarga = () => new AIError('sobrecargado', true, '{"error":{"code":503,"status":"UNAVAILABLE"}}')

beforeEach(() => {
  generate.mockReset()
})

describe('generarSintesisCertificado — triage (falla abierto)', () => {
  it('reintenta un 503 del triage y conserva el filtro', async () => {
    generate
      .mockRejectedValueOnce(sobrecarga())
      .mockResolvedValueOnce(respuesta(JSON.stringify({ descartar: [{ clave: 'SQL', motivo: 'no aporta' }] })))
      .mockResolvedValueOnce(SINTESIS_OK)

    // Dos competencias y no una: descartar la única haría saltar la válvula que
    // ignora un triage capaz de vaciar el perfil técnico entero.
    const r = await generarSintesisCertificado(ctx({ competenciasTecnicas: ['SQL', 'Python'] }))

    // 2 del triage + 1 de la redacción.
    expect(generate).toHaveBeenCalledTimes(3)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.sintesis.descartados?.map(d => d.clave)).toEqual(['SQL'])
  })

  it('si el triage no afloja, sigue sin filtro en vez de abortar la síntesis', async () => {
    generate
      .mockRejectedValueOnce(sobrecarga())
      .mockRejectedValueOnce(sobrecarga())
      .mockResolvedValueOnce(SINTESIS_OK)

    const r = await generarSintesisCertificado(ctx())

    expect(generate).toHaveBeenCalledTimes(3)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.sintesis.descartados).toBeUndefined()
  })

  it('un fallo no transitorio del triage no gasta un segundo intento', async () => {
    generate
      .mockRejectedValueOnce(new AIError('configuracion', false, 'GEMINI_API_KEY is not set'))
      .mockResolvedValueOnce(SINTESIS_OK)

    const r = await generarSintesisCertificado(ctx())

    // 1 del triage (sin reintento) + 1 de la redacción.
    expect(generate).toHaveBeenCalledTimes(2)
    expect(r.ok).toBe(true)
  })
})

describe('generarSintesisCertificado — redacción (falla cerrado)', () => {
  it('reintenta un 503 de la redacción y se queda con la buena', async () => {
    generate.mockResolvedValueOnce(TRIAGE_VACIO).mockRejectedValueOnce(sobrecarga()).mockResolvedValueOnce(SINTESIS_OK)

    const r = await generarSintesisCertificado(ctx())

    expect(generate).toHaveBeenCalledTimes(3)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.sintesis.perfilIntegrado).toBe('Un párrafo de perfil integrado.')
  })

  it('guarda sólo el párrafo: las claves del esquema viejo no se escriben', async () => {
    // El modelo devuelve de más —como haría una síntesis v4— y se ignora todo
    // menos el párrafo. Así las filas nuevas no arrastran campos que nadie lee.
    generate.mockResolvedValueOnce(TRIAGE_VACIO).mockResolvedValueOnce(
      respuesta(
        JSON.stringify({
          perfilIntegrado: 'El párrafo.',
          fortalezas: [{ titulo: 'Analítica', texto: 'Texto.' }],
          contextoIdeal: 'Equipos chicos.',
          competenciasIntegradas: ['SQL'],
        }),
      ),
    )

    const r = await generarSintesisCertificado(ctx())

    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.sintesis.perfilIntegrado).toBe('El párrafo.')
    expect(Object.keys(r.sintesis).sort()).toEqual(['generadaAt', 'objetivo', 'perfilIntegrado', 'version'])
    expect(r.sintesis.version).toBe(SINTESIS_VERSION)
  })

  it('si el 503 se repite, avisa en castellano y sin JSON del proveedor', async () => {
    generate.mockResolvedValueOnce(TRIAGE_VACIO).mockRejectedValue(sobrecarga())

    const r = await generarSintesisCertificado(ctx())

    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.motivo).toBe('El servicio de IA está sobrecargado en este momento. Probá de nuevo en unos minutos.')
    expect(r.motivo).not.toContain('503')
    expect(r.motivo).not.toContain('{')
  })

  it('no filtra la credencial en el mensaje de pantalla', async () => {
    generate
      .mockResolvedValueOnce(TRIAGE_VACIO)
      .mockRejectedValue(new AIError('configuracion', false, 'GEMINI_API_KEY is not set in environment variables.'))

    const r = await generarSintesisCertificado(ctx())

    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.motivo).toBe('El servicio de IA no está configurado correctamente. Avisale al equipo de MiLiors.')
    expect(r.motivo).not.toContain('GEMINI_API_KEY')
  })

  it('reintenta si el JSON viene roto', async () => {
    generate
      .mockResolvedValueOnce(TRIAGE_VACIO)
      .mockResolvedValueOnce(respuesta('no soy JSON'))
      .mockResolvedValueOnce(SINTESIS_OK)

    const r = await generarSintesisCertificado(ctx())

    expect(generate).toHaveBeenCalledTimes(3)
    expect(r.ok).toBe(true)
  })

  it('reintenta si falta el perfil integrado y corta si vuelve a faltar', async () => {
    generate.mockResolvedValueOnce(TRIAGE_VACIO).mockResolvedValue(respuesta(JSON.stringify({ perfilIntegrado: '  ' })))

    const r = await generarSintesisCertificado(ctx())

    // 1 del triage + 2 de la redacción.
    expect(generate).toHaveBeenCalledTimes(3)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.motivo).toContain('perfil integrado')
  })
})
