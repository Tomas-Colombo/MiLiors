import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  checkSessionCacheado,
  CHECK_SESSION_TTL_MS,
  _resetCheckSessionCache,
} from './check-session-cache'

/**
 * El cache reemplaza una consulta por request: lo que importa es que no deje
 * pasar una sesión revocada más allá del TTL y que no se quede con errores.
 */

beforeEach(() => _resetCheckSessionCache())

describe('checkSessionCacheado', () => {
  it('una sesión OK no se vuelve a consultar dentro del TTL', async () => {
    const consultar = vi.fn().mockResolvedValue(null)

    expect(await checkSessionCacheado('u1', consultar, 0)).toBeNull()
    expect(await checkSessionCacheado('u1', consultar, CHECK_SESSION_TTL_MS - 1)).toBeNull()

    expect(consultar).toHaveBeenCalledTimes(1)
  })

  it('vencido el TTL vuelve a consultar y detecta la revocación', async () => {
    const consultar = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce('revocada')

    await checkSessionCacheado('u1', consultar, 0)
    const motivo = await checkSessionCacheado('u1', consultar, CHECK_SESSION_TTL_MS)

    expect(motivo).toBe('revocada')
    expect(consultar).toHaveBeenCalledTimes(2)
  })

  it('requests simultáneos del mismo usuario comparten una sola consulta', async () => {
    let resolver!: (v: string | null) => void
    const consultar = vi.fn(() => new Promise<string | null>((r) => (resolver = r)))

    const a = checkSessionCacheado('u1', consultar, 0)
    const b = checkSessionCacheado('u1', consultar, 1)
    resolver(null)

    expect(await Promise.all([a, b])).toEqual([null, null])
    expect(consultar).toHaveBeenCalledTimes(1)
  })

  it('un motivo de cierre no se cachea', async () => {
    const consultar = vi.fn().mockResolvedValueOnce('revocada').mockResolvedValueOnce(null)

    expect(await checkSessionCacheado('u1', consultar, 0)).toBe('revocada')
    // Tras el signOut y un login nuevo, se consulta de nuevo en lugar de repetir el motivo.
    expect(await checkSessionCacheado('u1', consultar, 1)).toBeNull()
    expect(consultar).toHaveBeenCalledTimes(2)
  })

  it('un error no se cachea: el próximo request reintenta', async () => {
    const consultar = vi.fn().mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce(null)

    await expect(checkSessionCacheado('u1', consultar, 0)).rejects.toThrow('timeout')
    expect(await checkSessionCacheado('u1', consultar, 1)).toBeNull()
    expect(consultar).toHaveBeenCalledTimes(2)
  })

  it('cada usuario tiene su propia entrada', async () => {
    const consultar = vi.fn().mockResolvedValue(null)

    await checkSessionCacheado('u1', consultar, 0)
    await checkSessionCacheado('u2', consultar, 0)

    expect(consultar).toHaveBeenCalledTimes(2)
  })
})
