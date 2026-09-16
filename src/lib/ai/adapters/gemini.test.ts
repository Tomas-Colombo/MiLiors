import { describe, it, expect } from 'vitest'
import { clasificarErrorGemini } from './gemini'
import { AIError } from '../port'

/**
 * El clasificador es lo que decide si el informe se reintenta o se cae. Los
 * mensajes de abajo son los que devuelve la API de verdad: el SDK lanza un
 * Error cuyo `message` es el JSON crudo.
 */

describe('clasificarErrorGemini', () => {
  it('un 503 es sobrecarga y es transitorio', () => {
    // El caso real que hizo fallar una regeneración en producción.
    const err = clasificarErrorGemini(
      new Error(
        '{"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","status":"UNAVAILABLE"}}',
      ),
    )
    expect(err.kind).toBe('sobrecargado')
    expect(err.transitorio).toBe(true)
  })

  it('reconoce la sobrecarga por status aunque no venga el código', () => {
    const err = clasificarErrorGemini(new Error('{"error":{"status":"UNAVAILABLE"}}'))
    expect(err.kind).toBe('sobrecargado')
    expect(err.transitorio).toBe(true)
  })

  it('un 429 es límite de pedidos y es transitorio', () => {
    const err = clasificarErrorGemini(
      new Error('{"error":{"code":429,"status":"RESOURCE_EXHAUSTED","message":"Quota exceeded"}}'),
    )
    expect(err.kind).toBe('limite')
    expect(err.transitorio).toBe(true)
  })

  it('cualquier otro 5xx es problema del servidor y es transitorio', () => {
    const err = clasificarErrorGemini(new Error('{"error":{"code":500,"status":"INTERNAL"}}'))
    expect(err.kind).toBe('servidor')
    expect(err.transitorio).toBe(true)
  })

  it('un 401 o un 403 son configuración y NO son transitorios', () => {
    for (const code of [400, 401, 403]) {
      const err = clasificarErrorGemini(new Error(`{"error":{"code":${code}}}`))
      expect(err.kind).toBe('configuracion')
      expect(err.transitorio).toBe(false)
    }
  })

  it('un error sin forma reconocible no se reintenta', () => {
    const err = clasificarErrorGemini(new Error('socket hang up'))
    expect(err.kind).toBe('desconocido')
    expect(err.transitorio).toBe(false)
  })

  it('deja pasar un AIError ya clasificado sin volver a interpretarlo', () => {
    const original = new AIError('truncado', false, 'MAX_TOKENS')
    expect(clasificarErrorGemini(original)).toBe(original)
  })

  it('conserva el mensaje crudo para el log', () => {
    const raw = '{"error":{"code":503,"status":"UNAVAILABLE"}}'
    expect(clasificarErrorGemini(new Error(raw)).message).toBe(raw)
  })

  it('no explota con algo que no es Error', () => {
    const err = clasificarErrorGemini('se cayó todo')
    expect(err).toBeInstanceOf(AIError)
    expect(err.transitorio).toBe(false)
  })
})
