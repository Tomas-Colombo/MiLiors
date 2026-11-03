import { describe, it, expect, vi, beforeEach } from 'vitest'
import { togglePerfilEnBusqueda } from './actions'
import { verifySession } from '@/lib/dal'
import { getPerfilPostulanteActual } from '@/modules/perfil/queries'
import { getTestEneagramaDePostulante } from '@/modules/eneagrama/queries'
import { getInformeActual } from '@/modules/informe/queries'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ROL_USUARIO, ESTADO_INFORME } from '@/lib/constants/enums'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/dal', () => ({
  verifySession: vi.fn(),
}))

vi.mock('@/modules/perfil/queries', () => ({
  getPerfilPostulanteActual: vi.fn(),
}))

vi.mock('@/modules/eneagrama/queries', () => ({
  getTestEneagramaDePostulante: vi.fn(),
}))

vi.mock('@/modules/informe/queries', () => ({
  getInformeActual: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('togglePerfilEnBusqueda', () => {
  const eqMock = vi.fn().mockResolvedValue({ error: null })
  const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
  const fromMock = vi.fn().mockReturnValue({ update: updateMock })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockResolvedValue({
      from: fromMock,
    } as unknown as Awaited<ReturnType<typeof createClient>>)
  })

  it('rechaza la acción si la sesión no corresponde al rol POSTULANTE', async () => {
    vi.mocked(verifySession).mockResolvedValueOnce({
      id: 'usr-reclutador',
      email: 'rec@example.com',
      rol: ROL_USUARIO.RECLUTADOR,
    })

    const resultado = await togglePerfilEnBusqueda(true)

    expect(resultado).toEqual({
      success: false,
      error: 'Solo los postulantes pueden modificar su visibilidad de búsqueda.',
    })
    expect(fromMock).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('rechaza activar la visibilidad si el postulante no tiene test de eneagrama', async () => {
    vi.mocked(verifySession).mockResolvedValueOnce({
      id: 'usr-1',
      email: 'post@example.com',
      rol: ROL_USUARIO.POSTULANTE,
    })
    vi.mocked(getPerfilPostulanteActual).mockResolvedValueOnce({
      id: 'perfil-1',
      nombre_completo: 'Juan Pérez',
      nombre_preferido: null,
      fecha_nacimiento: null,
      telefono: null,
      carrera_id: null,
      carrera_otra: null,
      enlace_linkedin: null,
      portfolio: null,
      localidad_id: null,
      provincia_id: null,
      perfil_en_busqueda: false,
      mostrar_personalidad_publico: false,
    })
    vi.mocked(getTestEneagramaDePostulante).mockResolvedValueOnce(null)

    const resultado = await togglePerfilEnBusqueda(true)

    expect(resultado).toEqual({
      success: false,
      error: 'Debés completar el test de personalidad antes de hacer visible tu perfil.',
    })
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('rechaza activar la visibilidad si el test no tiene dominantes', async () => {
    vi.mocked(verifySession).mockResolvedValueOnce({
      id: 'usr-1',
      email: 'post@example.com',
      rol: ROL_USUARIO.POSTULANTE,
    })
    vi.mocked(getPerfilPostulanteActual).mockResolvedValueOnce({
      id: 'perfil-1',
      nombre_completo: 'Juan Pérez',
      nombre_preferido: null,
      fecha_nacimiento: null,
      telefono: null,
      carrera_id: null,
      carrera_otra: null,
      enlace_linkedin: null,
      portfolio: null,
      localidad_id: null,
      provincia_id: null,
      perfil_en_busqueda: false,
      mostrar_personalidad_publico: false,
    })
    vi.mocked(getTestEneagramaDePostulante).mockResolvedValueOnce({
      id: 'test-1',
      fecha_realizacion: '2026-01-01',
      updated_at: '2026-01-01',
      veces_completado: 1,
      tiene_empate_dominante: false,
      dominantes_empate: null,
      test_eneagrama_dominante: [],
    })

    const resultado = await togglePerfilEnBusqueda(true)

    expect(resultado).toEqual({
      success: false,
      error: 'Debés completar el test de personalidad antes de hacer visible tu perfil.',
    })
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('rechaza activar la visibilidad si el informe no está en estado LISTO', async () => {
    vi.mocked(verifySession).mockResolvedValueOnce({
      id: 'usr-1',
      email: 'post@example.com',
      rol: ROL_USUARIO.POSTULANTE,
    })
    vi.mocked(getPerfilPostulanteActual).mockResolvedValueOnce({
      id: 'perfil-1',
      nombre_completo: 'Juan Pérez',
      nombre_preferido: null,
      fecha_nacimiento: null,
      telefono: null,
      carrera_id: null,
      carrera_otra: null,
      enlace_linkedin: null,
      portfolio: null,
      localidad_id: null,
      provincia_id: null,
      perfil_en_busqueda: false,
      mostrar_personalidad_publico: false,
    })
    vi.mocked(getTestEneagramaDePostulante).mockResolvedValueOnce({
      id: 'test-1',
      fecha_realizacion: '2026-01-01',
      updated_at: '2026-01-01',
      veces_completado: 1,
      tiene_empate_dominante: false,
      dominantes_empate: null,
      test_eneagrama_dominante: [
        {
          id: 'dom-1',
          puntaje_crudo: 40,
          porcentaje: 85,
          eneatipo: { numero_eneatipo: 3, nombre: 'El Triunfador', descripcion: null },
        },
      ],
    })
    vi.mocked(getInformeActual).mockResolvedValueOnce({
      id: 'inf-1',
      contenido_json: null,
      estado_informe: ESTADO_INFORME.PENDIENTE,
      fecha_generacion: '2026-01-01',
      updated_at: '2026-01-01',
      desactualizado: false,
    })

    const resultado = await togglePerfilEnBusqueda(true)

    expect(resultado).toEqual({
      success: false,
      error: 'Tu informe de personalidad debe estar listo antes de hacer visible tu perfil.',
    })
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('activa la visibilidad exitosamente cuando el test tiene dominantes y el informe está LISTO', async () => {
    vi.mocked(verifySession).mockResolvedValueOnce({
      id: 'usr-1',
      email: 'post@example.com',
      rol: ROL_USUARIO.POSTULANTE,
    })
    vi.mocked(getPerfilPostulanteActual).mockResolvedValueOnce({
      id: 'perfil-1',
      nombre_completo: 'Juan Pérez',
      nombre_preferido: null,
      fecha_nacimiento: null,
      telefono: null,
      carrera_id: null,
      carrera_otra: null,
      enlace_linkedin: null,
      portfolio: null,
      localidad_id: null,
      provincia_id: null,
      perfil_en_busqueda: false,
      mostrar_personalidad_publico: false,
    })
    vi.mocked(getTestEneagramaDePostulante).mockResolvedValueOnce({
      id: 'test-1',
      fecha_realizacion: '2026-01-01',
      updated_at: '2026-01-01',
      veces_completado: 1,
      tiene_empate_dominante: false,
      dominantes_empate: null,
      test_eneagrama_dominante: [
        {
          id: 'dom-1',
          puntaje_crudo: 40,
          porcentaje: 85,
          eneatipo: { numero_eneatipo: 3, nombre: 'El Triunfador', descripcion: null },
        },
      ],
    })
    vi.mocked(getInformeActual).mockResolvedValueOnce({
      id: 'inf-1',
      contenido_json: null,
      estado_informe: ESTADO_INFORME.LISTO,
      fecha_generacion: '2026-01-01',
      updated_at: '2026-01-01',
      desactualizado: false,
    })

    const resultado = await togglePerfilEnBusqueda(true)

    expect(resultado).toEqual({ success: true, data: undefined })
    expect(fromMock).toHaveBeenCalledWith('perfil_postulante')
    expect(updateMock).toHaveBeenCalledWith({ perfil_en_busqueda: true })
    expect(eqMock).toHaveBeenCalledWith('usuario_id', 'usr-1')
    expect(revalidatePath).toHaveBeenCalledWith('/postulante')
    expect(revalidatePath).toHaveBeenCalledWith('/postulante/perfil')
    expect(revalidatePath).toHaveBeenCalledWith('/reclutador/postulantes')
  })

  it('permite desactivar la visibilidad siempre, sin chequear test ni informe', async () => {
    vi.mocked(verifySession).mockResolvedValueOnce({
      id: 'usr-1',
      email: 'post@example.com',
      rol: ROL_USUARIO.POSTULANTE,
    })

    const resultado = await togglePerfilEnBusqueda(false)

    expect(resultado).toEqual({ success: true, data: undefined })
    expect(getPerfilPostulanteActual).not.toHaveBeenCalled()
    expect(getTestEneagramaDePostulante).not.toHaveBeenCalled()
    expect(getInformeActual).not.toHaveBeenCalled()
    expect(updateMock).toHaveBeenCalledWith({ perfil_en_busqueda: false })
    expect(eqMock).toHaveBeenCalledWith('usuario_id', 'usr-1')
    expect(revalidatePath).toHaveBeenCalledWith('/postulante')
    expect(revalidatePath).toHaveBeenCalledWith('/postulante/perfil')
    expect(revalidatePath).toHaveBeenCalledWith('/reclutador/postulantes')
  })
})
