import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getProvincias,
  getDepartamentosPorProvincia,
  getLocalidadesPorDepartamento,
} from './queries'
import { createClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('ubicacion/queries (H-216)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getProvincias', () => {
    it('lanza error cuando Supabase falla', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'db error' },
      })
      const mockIs = vi.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = vi.fn().mockReturnValue({ is: mockIs })
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

      vi.mocked(createClient).mockResolvedValue({
        from: mockFrom,
      } as unknown as Awaited<ReturnType<typeof createClient>>)

      await expect(getProvincias()).rejects.toThrow('No se pudo cargar el catálogo.')
    })

    it('devuelve la lista de provincias cuando no hay error', async () => {
      const mockData = [
        { id: 'p1', nombre: 'Buenos Aires' },
        { id: 'p2', nombre: 'Córdoba' },
      ]
      const mockOrder = vi.fn().mockResolvedValue({ data: mockData, error: null })
      const mockIs = vi.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = vi.fn().mockReturnValue({ is: mockIs })
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

      vi.mocked(createClient).mockResolvedValue({
        from: mockFrom,
      } as unknown as Awaited<ReturnType<typeof createClient>>)

      const res = await getProvincias()
      expect(res).toEqual(mockData)
    })
  })

  describe('getDepartamentosPorProvincia', () => {
    it('devuelve [] sin consultar si el id está vacío', async () => {
      const res = await getDepartamentosPorProvincia('')
      expect(res).toEqual([])
      expect(createClient).not.toHaveBeenCalled()
    })

    it('lanza error cuando Supabase falla', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'db error' },
      })
      const mockIs = vi.fn().mockReturnValue({ order: mockOrder })
      const mockEq = vi.fn().mockReturnValue({ is: mockIs })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

      vi.mocked(createClient).mockResolvedValue({
        from: mockFrom,
      } as unknown as Awaited<ReturnType<typeof createClient>>)

      await expect(getDepartamentosPorProvincia('prov-1')).rejects.toThrow(
        'No se pudo cargar el catálogo.',
      )
    })

    it('devuelve las opciones formateadas cuando no hay error', async () => {
      const mockRows = [{ id: 'd1', nombre: 'Capital' }]
      const mockOrder = vi.fn().mockResolvedValue({ data: mockRows, error: null })
      const mockIs = vi.fn().mockReturnValue({ order: mockOrder })
      const mockEq = vi.fn().mockReturnValue({ is: mockIs })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

      vi.mocked(createClient).mockResolvedValue({
        from: mockFrom,
      } as unknown as Awaited<ReturnType<typeof createClient>>)

      const res = await getDepartamentosPorProvincia('prov-1')
      expect(res).toEqual([{ value: 'd1', label: 'Capital' }])
    })
  })

  describe('getLocalidadesPorDepartamento', () => {
    it('devuelve [] sin consultar si el id está vacío', async () => {
      const res = await getLocalidadesPorDepartamento('')
      expect(res).toEqual([])
      expect(createClient).not.toHaveBeenCalled()
    })

    it('lanza error cuando Supabase falla', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'db error' },
      })
      const mockIs = vi.fn().mockReturnValue({ order: mockOrder })
      const mockEq = vi.fn().mockReturnValue({ is: mockIs })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

      vi.mocked(createClient).mockResolvedValue({
        from: mockFrom,
      } as unknown as Awaited<ReturnType<typeof createClient>>)

      await expect(getLocalidadesPorDepartamento('dep-1')).rejects.toThrow(
        'No se pudo cargar el catálogo.',
      )
    })

    it('devuelve las opciones formateadas cuando no hay error', async () => {
      const mockRows = [{ id: 'loc-1', nombre: 'Centro' }]
      const mockOrder = vi.fn().mockResolvedValue({ data: mockRows, error: null })
      const mockIs = vi.fn().mockReturnValue({ order: mockOrder })
      const mockEq = vi.fn().mockReturnValue({ is: mockIs })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

      vi.mocked(createClient).mockResolvedValue({
        from: mockFrom,
      } as unknown as Awaited<ReturnType<typeof createClient>>)

      const res = await getLocalidadesPorDepartamento('dep-1')
      expect(res).toEqual([{ value: 'loc-1', label: 'Centro' }])
    })
  })
})
