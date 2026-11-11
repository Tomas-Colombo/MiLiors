'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { ROL_USUARIO, ESTADO_INFORME } from '@/lib/constants/enums'
import { getPerfilPostulanteActual } from '@/modules/perfil/queries'
import { getTestEneagramaDePostulante } from '@/modules/eneagrama/queries'
import { getInformeActual } from '@/modules/informe/queries'
import { evaluarRequisitosVisibilidad, MENSAJE_VISIBILIDAD_POSTULANTE } from './regla'
import type { ActionResult } from '@/lib/types/domain'

/**
 * Enciende o apaga la visibilidad del postulante en el buscador de reclutadores.
 *
 * Reglas de negocio (H-208):
 * - Requiere rol POSTULANTE.
 * - Desactivar (activo = false) se permite siempre para garantizar el derecho a no ser buscado.
 * - Activar (activo = true) exige haber completado el test de eneagrama (con al menos un
 *   eneatipo dominante) y contar con el informe de personalidad en estado LISTO.
 *
 * Al mutar, revalida también `/reclutador/postulantes` para reflejar el cambio en la lista
 * de candidatos disponibles para reclutadores (H-223).
 */
export async function togglePerfilEnBusqueda(activo: boolean): Promise<ActionResult> {
  const session = await verifySession()

  // 1. Guard de rol: sólo un postulante puede modificar su visibilidad de búsqueda
  if (session.rol !== ROL_USUARIO.POSTULANTE) {
    return {
      success: false,
      error: 'Solo los postulantes pueden modificar su visibilidad de búsqueda.',
    }
  }

  // 2. Precondiciones para activar visibilidad
  if (activo) {
    const perfil = await getPerfilPostulanteActual()
    if (perfil?.bloqueado_por_admin) {
      return {
        success: false,
        error: 'Tu perfil fue pausado por la administración. Escribinos si creés que es un error.',
      }
    }
    const test = perfil ? await getTestEneagramaDePostulante(perfil.id) : null
    const tieneDominante = !!(test?.test_eneagrama_dominante && test.test_eneagrama_dominante.length > 0)
    const informe = perfil && tieneDominante ? await getInformeActual() : null
    const informeListo = informe?.estado_informe === ESTADO_INFORME.LISTO

    const evaluacion = evaluarRequisitosVisibilidad({
      existePerfil: !!perfil,
      tieneDominante,
      informeListo,
    })

    if (!evaluacion.ok) {
      return { success: false, error: MENSAJE_VISIBILIDAD_POSTULANTE[evaluacion.motivo] }
    }
  }

  // 3. Persistencia
  const supabase = await createClient()
  const { error } = await supabase
    .from('perfil_postulante')
    .update({ perfil_en_busqueda: activo })
    .eq('usuario_id', session.id)

  if (error) {
    return { success: false, error: 'No se pudo actualizar la visibilidad.' }
  }

  // 4. Revalidación de rutas dependientes
  revalidatePath('/postulante')
  revalidatePath('/postulante/perfil')
  revalidatePath('/reclutador/postulantes')

  return { success: true, data: undefined }
}
