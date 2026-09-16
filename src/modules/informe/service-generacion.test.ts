import { describe, it, expect, vi, beforeEach } from 'vitest'
import { COMO_TRABAJAS_TITULOS, COMPETENCIAS } from './competencias'
import { AIError } from '@/lib/ai/port'

/**
 * El reintento y el corte ante una respuesta defectuosa. Se mockea el proveedor
 * porque lo que se prueba es la política —cuántas veces se llama y con qué se
 * corta—, no lo que escribe el modelo.
 */

const generate = vi.fn()
// Se mockea sólo el proveedor: `AIError` tiene que seguir siendo la clase real,
// porque el service decide si reintenta con un `instanceof`.
vi.mock('@/lib/ai', async () => {
  const port = await import('@/lib/ai/port')
  return {
    aiProvider: { generate: (...args: unknown[]) => generate(...args) },
    AIError: port.AIError,
  }
})

const { generarInformePersonalidad } = await import('./service')

const ctx = {
  nombre: 'Ana Pérez',
  especificidadPuesto: 'Administración',
  scores: { 1: 52, 2: 78, 3: 65, 4: 41, 5: 38, 6: 55, 7: 71, 8: 49, 9: 60 },
  humanDesign: null,
}

/** Lo que devuelve el proveedor cuando todo sale bien. */
function respuestaCompleta(overrides: Record<string, unknown> = {}) {
  return {
    content: JSON.stringify({
      subtitulo: 'Perfil relacional',
      descripcionPersonalidad: 'Párrafo de personalidad.',
      competenciasDesc: COMPETENCIAS.map(c => ({ nombre: c.nombre, descripcion: 'Descripción.' })),
      comoTrabajas: COMO_TRABAJAS_TITULOS.map(titulo => ({ titulo, texto: 'Texto.' })),
      ...overrides,
    }),
    usage: { inputTokens: 900, outputTokens: 2300 },
    model: 'gemini-2.5-flash',
  }
}

/** Respuesta a la que le falta una competencia: el caso silencioso de antes. */
function respuestaIncompleta() {
  return respuestaCompleta({
    competenciasDesc: COMPETENCIAS.slice(0, 11).map(c => ({ nombre: c.nombre, descripcion: 'Descripción.' })),
  })
}

beforeEach(() => {
  generate.mockReset()
})

describe('generarInformePersonalidad', () => {
  it('devuelve el informe cuando la primera respuesta viene completa, sin reintentar', async () => {
    generate.mockResolvedValueOnce(respuestaCompleta())

    const r = await generarInformePersonalidad(ctx)

    expect(r.ok).toBe(true)
    expect(generate).toHaveBeenCalledTimes(1)
    if (!r.ok) return
    expect(r.contenido_json.competencias).toHaveLength(13)
    expect(r.tokens).toEqual({ input: 900, output: 2300 })
  })

  it('reintenta una vez si la prosa viene incompleta y se queda con la buena', async () => {
    generate.mockResolvedValueOnce(respuestaIncompleta()).mockResolvedValueOnce(respuestaCompleta())

    const r = await generarInformePersonalidad(ctx)

    expect(generate).toHaveBeenCalledTimes(2)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.contenido_json.competencias.every(c => c.descripcion.length > 0)).toBe(true)
  })

  it('reintenta una vez si el JSON viene roto', async () => {
    generate
      .mockResolvedValueOnce({ content: 'no soy JSON', usage: { inputTokens: 1, outputTokens: 1 }, model: 'm' })
      .mockResolvedValueOnce(respuestaCompleta())

    const r = await generarInformePersonalidad(ctx)

    expect(generate).toHaveBeenCalledTimes(2)
    expect(r.ok).toBe(true)
  })

  it('corta después del segundo intento fallido en vez de guardar un informe con huecos', async () => {
    generate.mockResolvedValue(respuestaIncompleta())

    const r = await generarInformePersonalidad(ctx)

    expect(generate).toHaveBeenCalledTimes(2)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.motivo).toContain('incompleto')
  })

  it('reintenta un 503 del proveedor: es el caso que se arregla solo', async () => {
    // Pasó en producción: rehacer el Human Design devolvió 503 UNAVAILABLE y el
    // informe falló; el usuario apretó el botón otra vez y salió. Ese reintento
    // lo tiene que hacer el código.
    generate
      .mockRejectedValueOnce(new AIError('sobrecargado', true, '{"error":{"code":503}}'))
      .mockResolvedValueOnce(respuestaCompleta())

    const r = await generarInformePersonalidad(ctx)

    expect(generate).toHaveBeenCalledTimes(2)
    expect(r.ok).toBe(true)
  })

  it('si el 503 se repite, avisa en castellano y sin JSON del proveedor', async () => {
    generate.mockRejectedValue(new AIError('sobrecargado', true, '{"error":{"code":503,"status":"UNAVAILABLE"}}'))

    const r = await generarInformePersonalidad(ctx)

    expect(generate).toHaveBeenCalledTimes(2)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.motivo).toBe('El servicio de IA está sobrecargado en este momento. Probá de nuevo en unos minutos.')
    expect(r.motivo).not.toContain('503')
    expect(r.motivo).not.toContain('{')
  })

  it('no reintenta si falta la credencial: otro tiro no lo arregla', async () => {
    generate.mockRejectedValue(
      new AIError('configuracion', false, 'GEMINI_API_KEY is not set in environment variables.'),
    )

    const r = await generarInformePersonalidad(ctx)

    expect(generate).toHaveBeenCalledTimes(1)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.motivo).toBe('El servicio de IA no está configurado correctamente. Avisale al equipo de MiLiors.')
    // El mensaje crudo va al log, nunca a la pantalla.
    expect(r.motivo).not.toContain('GEMINI_API_KEY')
  })

  it('no reintenta una respuesta truncada: el presupuesto de tokens no cambia solo', async () => {
    generate.mockRejectedValue(new AIError('truncado', false, 'MAX_TOKENS'))

    const r = await generarInformePersonalidad(ctx)

    expect(generate).toHaveBeenCalledTimes(1)
    expect(r.ok).toBe(false)
  })

  it('un error que no es AIError se trata como no transitorio', async () => {
    generate.mockRejectedValue(new Error('boom'))

    const r = await generarInformePersonalidad(ctx)

    expect(generate).toHaveBeenCalledTimes(1)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.motivo).toBe('El servicio de IA no respondió como se esperaba. Probá de nuevo.')
  })
})
