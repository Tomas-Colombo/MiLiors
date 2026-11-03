'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { ROL_USUARIO, ESTADO_INFORME } from '@/lib/constants/enums'
import { getPerfilPostulanteActual } from '@/modules/perfil/queries'
import { getTestEneagramaDePostulante } from '@/modules/eneagrama/queries'
import { getInformeActual } from '@/modules/informe/queries'
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
    if (!perfil) {
      return {
        success: false,
        error: 'No se encontró el perfil del postulante.',
      }
    }

    // Debe existir test de eneagrama con al menos un dominante (mismo criterio que requireEneagramaCompleto)
    const test = await getTestEneagramaDePostulante(perfil.id)
    if (!test || !test.test_eneagrama_dominante || test.test_eneagrama_dominante.length === 0) {
      return {
        success: false,
        error: 'Debés completar el test de personalidad antes de hacer visible tu perfil.',
      }
    }

    // El informe de personalidad debe estar listo
    const informe = await getInformeActual()
    if (!informe || informe.estado_informe !== ESTADO_INFORME.LISTO) {
      return {
        success: false,
        error: 'Tu informe de personalidad debe estar listo antes de hacer visible tu perfil.',
      }
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
