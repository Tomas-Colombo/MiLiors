import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cargarDepartamentos, cargarLocalidades } from './actions'
import * as ubicacionQueries from './queries'

vi.mock('./queries', () => ({
  getDepartamentosPorProvincia: vi.fn(),
  getLocalidadesPorDepartamento: vi.fn(),
}))

describe('ubicacion/actions (H-216)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('cargarDepartamentos', () => {
    it('devuelve [] sin consultar si no hay provinciaId', async () => {
      const res = await cargarDepartamentos('')
      expect(res).toEqual([])
      expect(ubicacionQueries.getDepartamentosPorProvincia).not.toHaveBeenCalled()
    })

    it('devuelve [] y ataja el error si la consulta lanza', async () => {
      vi.mocked(ubicacionQueries.getDepartamentosPorProvincia).mockRejectedValueOnce(
        new Error('No se pudo cargar el catálogo.'),
      )

      const res = await cargarDepartamentos('prov-1')
      expect(res).toEqual([])
    })

    it('devuelve la lista de opciones si la consulta es exitosa', async () => {
      const opciones = [{ value: 'dep-1', label: 'Capital' }]
      vi.mocked(ubicacionQueries.getDepartamentosPorProvincia).mockResolvedValueOnce(opciones)

      const res = await cargarDepartamentos('prov-1')
      expect(res).toEqual(opciones)
    })
  })

  describe('cargarLocalidades', () => {
    it('devuelve [] sin consultar si no hay departamentoId', async () => {
      const res = await cargarLocalidades('')
      expect(res).toEqual([])
      expect(ubicacionQueries.getLocalidadesPorDepartamento).not.toHaveBeenCalled()
    })

    it('devuelve [] y ataja el error si la consulta lanza', async () => {
      vi.mocked(ubicacionQueries.getLocalidadesPorDepartamento).mockRejectedValueOnce(
        new Error('No se pudo cargar el catálogo.'),
      )

      const res = await cargarLocalidades('dep-1')
      expect(res).toEqual([])
    })

    it('devuelve la lista de opciones si la consulta es exitosa', async () => {
      const opciones = [{ value: 'loc-1', label: 'Centro' }]
      vi.mocked(ubicacionQueries.getLocalidadesPorDepartamento).mockResolvedValueOnce(opciones)

      const res = await cargarLocalidades('dep-1')
      expect(res).toEqual(opciones)
    })
  })
})
