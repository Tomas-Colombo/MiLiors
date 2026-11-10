import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCarreras, getCarrerasOtras } from './queries'
import { createClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('carreras/queries (H-216)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCarreras', () => {
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

      await expect(getCarreras()).rejects.toThrow('No se pudo cargar el catálogo.')
    })

    it('devuelve las opciones cuando no hay error', async () => {
      const mockRows = [
        { id: '1', nombre: 'Abogacía' },
        { id: '2', nombre: 'Ingeniería en Sistemas' },
      ]
      const mockOrder = vi.fn().mockResolvedValue({
        data: mockRows,
        error: null,
      })
      const mockIs = vi.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = vi.fn().mockReturnValue({ is: mockIs })
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

      vi.mocked(createClient).mockResolvedValue({
        from: mockFrom,
      } as unknown as Awaited<ReturnType<typeof createClient>>)

      const res = await getCarreras()
      expect(res).toEqual([
        { value: '1', label: 'Abogacía' },
        { value: '2', label: 'Ingeniería en Sistemas' },
      ])
    })
  })

  describe('getCarrerasOtras', () => {
    it('lanza error cuando Supabase falla', async () => {
      const mockNot = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'db error' },
      })
      const mockSelect = vi.fn().mockReturnValue({ not: mockNot })
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

      vi.mocked(createClient).mockResolvedValue({
        from: mockFrom,
      } as unknown as Awaited<ReturnType<typeof createClient>>)

      await expect(getCarrerasOtras()).rejects.toThrow('No se pudo cargar el catálogo.')
    })

    it('devuelve las carreras libres deduplicadas y ordenadas', async () => {
      const mockRows = [
        { carrera_otra: 'Biotecnología' },
        { carrera_otra: 'Actuario' },
        { carrera_otra: 'Biotecnología' },
      ]
      const mockNot = vi.fn().mockResolvedValue({
        data: mockRows,
        error: null,
      })
      const mockSelect = vi.fn().mockReturnValue({ not: mockNot })
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

      vi.mocked(createClient).mockResolvedValue({
        from: mockFrom,
      } as unknown as Awaited<ReturnType<typeof createClient>>)

      const res = await getCarrerasOtras()
      expect(res).toEqual([
        { value: 'Actuario', label: 'Actuario' },
        { value: 'Biotecnología', label: 'Biotecnología' },
      ])
    })
  })
})
