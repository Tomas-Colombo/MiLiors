import { describe, it, expect, vi, beforeEach } from 'vitest'
import { crearNota, editarNota, eliminarNota } from './actions'
import { getReclutadorId } from '@/modules/empresas/queries'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { revalidatePath } from 'next/cache'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/modules/empresas/queries', () => ({
  getReclutadorId: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server-admin', () => ({
  createAdminClient: vi.fn(),
}))

describe('postulantes/actions — notas privadas y revalidación (H-102, H-228)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getReclutadorId).mockResolvedValue('reclutador-1')
  })

  describe('crearNota', () => {
    it('valida el contenido con notaContenidoSchema', async () => {
      const resVacia = await crearNota('post-1', '   ')
      expect(resVacia).toEqual({ success: false, error: 'La nota no puede estar vacía.' })

      const resExcedida = await crearNota('post-1', 'a'.repeat(2001))
      expect(resExcedida).toEqual({
        success: false,
        error: 'La nota no puede superar los 2000 caracteres.',
      })
    })

    it('al crear nota revalida postulante, postulaciones y notas', async () => {
      const insertSpy = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'nota-1' }, error: null }),
        }),
      })
      vi.mocked(createAdminClient).mockReturnValue({
        from: vi.fn().mockImplementation((table: string) => {
          if (table === 'nota_privada') {
            return { insert: insertSpy }
          }
          return {}
        }),
      } as unknown as ReturnType<typeof createAdminClient>)

      const res = await crearNota('postulante-1', 'Nota de prueba')
      expect(res.success).toBe(true)

      expect(revalidatePath).toHaveBeenCalledWith('/reclutador/postulantes/postulante-1')
      expect(revalidatePath).toHaveBeenCalledWith('/reclutador/postulaciones')
      expect(revalidatePath).toHaveBeenCalledWith('/reclutador/notas')
    })
  })

  describe('editarNota', () => {
    it('valida el contenido con notaContenidoSchema', async () => {
      const resVacia = await editarNota('nota-1', '')
      expect(resVacia).toEqual({ success: false, error: 'La nota no puede estar vacía.' })

      const resExcedida = await editarNota('nota-1', 'a'.repeat(2001))
      expect(resExcedida).toEqual({
        success: false,
        error: 'La nota no puede superar los 2000 caracteres.',
      })
    })

    it('devuelve error si no se encuentra la nota a editar', async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            }),
          }),
        }),
      } as unknown as Awaited<ReturnType<typeof createClient>>)

      const res = await editarNota('nota-inexistente', 'Contenido actualizado')
      expect(res).toEqual({ success: false, error: 'No se pudo actualizar la nota.' })
    })

    it('al editar nota con éxito revalida postulantes, detalle, postulaciones y notas', async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { postulante_id: 'postulante-99' },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      } as unknown as Awaited<ReturnType<typeof createClient>>)

      const res = await editarNota('nota-1', 'Contenido actualizado')
      expect(res).toEqual({ success: true, data: undefined })

      expect(revalidatePath).toHaveBeenCalledWith('/reclutador/postulantes')
      expect(revalidatePath).toHaveBeenCalledWith('/reclutador/postulantes/postulante-99')
      expect(revalidatePath).toHaveBeenCalledWith('/reclutador/postulaciones')
      expect(revalidatePath).toHaveBeenCalledWith('/reclutador/notas')
    })
  })

  describe('eliminarNota', () => {
    it('revalida las rutas dependientes al eliminar una nota', async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: vi.fn().mockReturnValue({
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        }),
      } as unknown as Awaited<ReturnType<typeof createClient>>)

      const res = await eliminarNota('nota-1', 'postulante-1')
      expect(res).toEqual({ success: true, data: undefined })

      expect(revalidatePath).toHaveBeenCalledWith('/reclutador/postulantes/postulante-1')
      expect(revalidatePath).toHaveBeenCalledWith('/reclutador/postulaciones')
      expect(revalidatePath).toHaveBeenCalledWith('/reclutador/notas')
    })
  })
})
