import { describe, it, expect, vi, beforeEach } from 'vitest'
import { limpiarDestinoDePuesto } from './destino'
import { borrarDestino, leerDestino } from '@/lib/destino-cookie'
import { getPuestoPorEnlace } from './queries'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/destino-cookie', () => ({ borrarDestino: vi.fn(), leerDestino: vi.fn() }))
vi.mock('./queries', () => ({ getPuestoPorEnlace: vi.fn() }))

const PUESTO = '11111111-1111-4111-8111-111111111111'
const OTRO = '22222222-2222-4222-8222-222222222222'
const TOKEN = 'A'.repeat(32)

describe('limpiarDestinoDePuesto', () => {
  beforeEach(() => vi.clearAllMocks())

  it('borra la cookie si el destino es el detalle de ese puesto', async () => {
    vi.mocked(leerDestino).mockResolvedValue(`/postulante/puestos/${PUESTO}?enlace=${TOKEN}`)
    await limpiarDestinoDePuesto(PUESTO)
    expect(borrarDestino).toHaveBeenCalledTimes(1)
  })

  it('borra la cookie si el destino es el link de ese puesto', async () => {
    vi.mocked(leerDestino).mockResolvedValue(`/empleos/${TOKEN}`)
    vi.mocked(getPuestoPorEnlace).mockResolvedValue({ puestoId: PUESTO } as never)
    await limpiarDestinoDePuesto(PUESTO)
    expect(borrarDestino).toHaveBeenCalledTimes(1)
  })

  it('no borra la cookie de otro puesto', async () => {
    vi.mocked(leerDestino).mockResolvedValue(`/empleos/${TOKEN}`)
    vi.mocked(getPuestoPorEnlace).mockResolvedValue({ puestoId: OTRO } as never)
    await limpiarDestinoDePuesto(PUESTO)
    expect(borrarDestino).not.toHaveBeenCalled()
  })

  it('sin cookie no hace nada', async () => {
    vi.mocked(leerDestino).mockResolvedValue(null)
    await limpiarDestinoDePuesto(PUESTO)
    expect(borrarDestino).not.toHaveBeenCalled()
  })

  it('un fallo al limpiar no se propaga (la postulación ya se registró)', async () => {
    vi.mocked(leerDestino).mockRejectedValue(new Error('cookies fuera de contexto'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(limpiarDestinoDePuesto(PUESTO)).resolves.toBeUndefined()
  })
})
