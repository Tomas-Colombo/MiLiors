import { describe, it, expect, vi, beforeEach } from 'vitest'
import { postularAPuesto, postularAPuestoConFormulario } from './actions'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { resolverAccesoPuesto } from '@/modules/puestos/acceso'
import { getFormularioDePuestoAdmin } from '@/modules/preselector/queries'
import { getCicloAbierto } from '@/modules/puestos/ciclos'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/server-admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn().mockResolvedValue({ id: 'user-1', email: 'a@example.test', rol: 'POSTULANTE' }),
}))
vi.mock('@/modules/puestos/acceso', () => ({ resolverAccesoPuesto: vi.fn() }))
vi.mock('@/modules/preselector/queries', () => ({ getFormularioDePuestoAdmin: vi.fn() }))
vi.mock('@/modules/puestos/ciclos', () => ({ getCicloAbierto: vi.fn() }))
vi.mock('@/modules/puestos/actividad', () => ({ marcarActividadPuesto: vi.fn() }))
vi.mock('@/modules/empresas/queries', () => ({ getReclutadorId: vi.fn() }))

const PUESTO = '11111111-1111-4111-8111-111111111111'
const TOKEN = 'A'.repeat(32)

/** Cliente RLS del postulante: perfil y certificado vigentes. */
function clienteConCertificado() {
  const from = vi.fn((tabla: string) => {
    const data =
      tabla === 'perfil_postulante' ? { id: 'postulante-1' } : { id: 'cert-1', desactualizado: false }
    const builder: Record<string, unknown> = {}
    builder.select = vi.fn(() => builder)
    builder.eq = vi.fn(() => builder)
    builder.order = vi.fn(() => builder)
    builder.limit = vi.fn(() => builder)
    builder.single = vi.fn(() => Promise.resolve({ data, error: null }))
    return builder
  })
  return { from } as unknown as Awaited<ReturnType<typeof createClient>>
}

/** Cliente admin: estado del puesto y registro de inserts en postulacion. */
function clienteAdmin(puesto: { activo: boolean; fecha_baja_puesto: string | null } | null) {
  const inserts: { tabla: string; payload: unknown }[] = []
  const from = vi.fn((tabla: string) => {
    const builder: Record<string, unknown> = {}
    builder.select = vi.fn(() => builder)
    builder.eq = vi.fn(() => builder)
    builder.maybeSingle = vi.fn(() => Promise.resolve({ data: puesto, error: null }))
    builder.single = vi.fn(() => Promise.resolve({ data: { id: 'postulacion-1' }, error: null }))
    builder.insert = vi.fn((payload: unknown) => {
      inserts.push({ tabla, payload })
      return Object.assign(Promise.resolve({ error: null }), builder)
    })
    return builder
  })
  vi.mocked(createAdminClient).mockReturnValue({ from } as unknown as ReturnType<typeof createAdminClient>)
  return { inserts }
}

const formularioCon = (esCritica = false) => ({
  id: 'form-1',
  puestoId: PUESTO,
  preguntas: [
    {
      id: 'preg-1',
      texto: 'Disponibilidad',
      tipo: 'TEXTO_LIBRE' as const,
      esCritica,
      orden: 1,
      opciones: [],
    },
  ],
})

describe('postulaciones/actions — acceso al puesto (visibilidad)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockResolvedValue(clienteConCertificado())
    vi.mocked(getCicloAbierto).mockResolvedValue('ciclo-1')
    vi.mocked(getFormularioDePuestoAdmin).mockResolvedValue(null)
  })

  describe('postularAPuesto', () => {
    it('sin acceso (puesto privado y sin link) devuelve "no disponible" y no inserta nada', async () => {
      vi.mocked(resolverAccesoPuesto).mockResolvedValue(null)
      const { inserts } = clienteAdmin({ activo: true, fecha_baja_puesto: null })

      const res = await postularAPuesto(PUESTO)

      expect(res).toEqual({ success: false, error: 'Este puesto no está disponible.' })
      expect(inserts).toHaveLength(0)
    })

    it('pasa el enlace a resolverAccesoPuesto', async () => {
      vi.mocked(resolverAccesoPuesto).mockResolvedValue({ via: 'enlace' })
      clienteAdmin({ activo: true, fecha_baja_puesto: null })

      await postularAPuesto(PUESTO, TOKEN)

      expect(resolverAccesoPuesto).toHaveBeenCalledWith(PUESTO, TOKEN)
    })

    it('con el link y requisitos completos crea la postulación', async () => {
      vi.mocked(resolverAccesoPuesto).mockResolvedValue({ via: 'enlace' })
      const { inserts } = clienteAdmin({ activo: true, fecha_baja_puesto: null })

      const res = await postularAPuesto(PUESTO, TOKEN)

      expect(res).toEqual({ success: true, data: undefined })
      expect(inserts).toEqual([
        {
          tabla: 'postulacion',
          payload: {
            postulante_id: 'postulante-1',
            puesto_id: PUESTO,
            historial_puesto_id: 'ciclo-1',
            estado: 'ENVIADA',
          },
        },
      ])
    })

    it.each([
      ['pausado', { activo: false, fecha_baja_puesto: null }],
      ['dado de baja', { activo: true, fecha_baja_puesto: '2026-11-01T00:00:00Z' }],
      ['inexistente', null],
    ])('un puesto %s no admite postulaciones aunque haya acceso', async (_nombre, estado) => {
      vi.mocked(resolverAccesoPuesto).mockResolvedValue({ via: 'postulado' })
      const { inserts } = clienteAdmin(estado)

      const res = await postularAPuesto(PUESTO)

      expect(res).toEqual({ success: false, error: 'Este puesto no está disponible.' })
      expect(inserts).toHaveLength(0)
    })

    it('si el puesto tiene formulario (cargado con service role) exige el preselector', async () => {
      vi.mocked(resolverAccesoPuesto).mockResolvedValue({ via: 'enlace' })
      vi.mocked(getFormularioDePuestoAdmin).mockResolvedValue(formularioCon())
      const { inserts } = clienteAdmin({ activo: true, fecha_baja_puesto: null })

      const res = await postularAPuesto(PUESTO, TOKEN)

      expect(res).toEqual({
        success: false,
        error: 'Este puesto requiere completar el formulario de preselección para postularte.',
      })
      expect(getFormularioDePuestoAdmin).toHaveBeenCalledWith(PUESTO)
      expect(inserts).toHaveLength(0)
    })
  })

  describe('postularAPuestoConFormulario', () => {
    const estadoInicial = { success: false as const, error: '' }

    function formData(campos: Record<string, string>) {
      const fd = new FormData()
      for (const [k, v] of Object.entries(campos)) fd.set(k, v)
      return fd
    }

    it('sin acceso devuelve "no disponible" y no inserta nada', async () => {
      vi.mocked(resolverAccesoPuesto).mockResolvedValue(null)
      const { inserts } = clienteAdmin({ activo: true, fecha_baja_puesto: null })

      const res = await postularAPuestoConFormulario(PUESTO, estadoInicial, formData({ respuesta_preg_1: 'x' }))

      expect(res).toEqual({ success: false, error: 'Este puesto no está disponible.' })
      expect(inserts).toHaveLength(0)
    })

    it('lee el enlace del formData', async () => {
      vi.mocked(resolverAccesoPuesto).mockResolvedValue(null)
      clienteAdmin({ activo: true, fecha_baja_puesto: null })

      await postularAPuestoConFormulario(PUESTO, estadoInicial, formData({ enlace: TOKEN }))

      expect(resolverAccesoPuesto).toHaveBeenCalledWith(PUESTO, TOKEN)
    })

    it('con el link y el formulario completo crea la postulación y guarda las respuestas', async () => {
      vi.mocked(resolverAccesoPuesto).mockResolvedValue({ via: 'enlace' })
      vi.mocked(getFormularioDePuestoAdmin).mockResolvedValue(formularioCon())
      const { inserts } = clienteAdmin({ activo: true, fecha_baja_puesto: null })

      const res = await postularAPuestoConFormulario(
        PUESTO,
        estadoInicial,
        formData({ enlace: TOKEN, 'respuesta_preg-1': 'Full time' }),
      )

      expect(res).toEqual({ success: true, data: { descartada: false } })
      expect(inserts.map((i) => i.tabla)).toEqual(['postulacion', 'respuesta_preselector'])
    })

    it('exige completar el formulario: sin respuestas no se crea la postulación', async () => {
      vi.mocked(resolverAccesoPuesto).mockResolvedValue({ via: 'enlace' })
      vi.mocked(getFormularioDePuestoAdmin).mockResolvedValue(formularioCon())
      const { inserts } = clienteAdmin({ activo: true, fecha_baja_puesto: null })

      const res = await postularAPuestoConFormulario(PUESTO, estadoInicial, formData({ enlace: TOKEN }))

      expect(res.success).toBe(false)
      expect(inserts).toHaveLength(0)
    })
  })
})
