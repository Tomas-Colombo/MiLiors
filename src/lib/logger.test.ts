import { describe, it, expect, vi } from 'vitest'
import { logAuditoria, logError } from './logger'

describe('logger', () => {
  it('logAuditoria emite una línea JSON con el formato esperado', () => {
    const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    logAuditoria({
      usuarioId: 'usr-123',
      accion: 'publicar_puesto',
      entidad: 'puesto',
      entidadId: 'puesto-456',
      detalle: { activo: true },
    })

    expect(consoleInfoSpy).toHaveBeenCalledTimes(1)
    const line = consoleInfoSpy.mock.calls[0][0]
    const parsed = JSON.parse(line)

    expect(parsed).toMatchObject({
      nivel: 'INFO',
      tipo: 'auditoria',
      usuarioId: 'usr-123',
      accion: 'publicar_puesto',
      entidad: 'puesto',
      entidadId: 'puesto-456',
      detalle: { activo: true },
    })
    expect(parsed.ts).toBeDefined()
    expect(typeof parsed.ts).toBe('string')

    consoleInfoSpy.mockRestore()
  })

  it('logError serializa solo name y message, sin propiedades extra del error', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const err = new Error('Operación fallida')
    err.name = 'CustomError'
    ;(err as unknown as Record<string, unknown>).stack = 'stack trace muy largo y sensible'
    ;(err as unknown as Record<string, unknown>).apiKey = 'clave-secreta-que-no-debe-aparecer'
    ;(err as unknown as Record<string, unknown>).internalPayload = { secret: 123 }

    logError('puestos/publicar', err, { puestoId: 'puesto-456' })

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    const line = consoleErrorSpy.mock.calls[0][0]
    const parsed = JSON.parse(line)

    expect(parsed.nivel).toBe('ERROR')
    expect(parsed.tipo).toBe('error')
    expect(parsed.contexto).toBe('puestos/publicar')
    expect(parsed.datos).toEqual({ puestoId: 'puesto-456' })
    expect(parsed.error).toEqual({
      name: 'CustomError',
      message: 'Operación fallida',
    })
    expect(parsed.error.stack).toBeUndefined()
    expect(parsed.error.apiKey).toBeUndefined()
    expect(parsed.error.internalPayload).toBeUndefined()
    expect(line).not.toContain('clave-secreta')
    expect(line).not.toContain('stack trace')

    consoleErrorSpy.mockRestore()
  })
})
