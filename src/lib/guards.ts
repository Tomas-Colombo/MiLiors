import 'server-only'
import { redirect } from 'next/navigation'
import { verifySession } from './dal'
import { getMisEmpresasBase } from '@/modules/empresas/queries'
import { getPerfilPostulanteActual } from '@/modules/perfil/queries'
import { getTestEneagramaDePostulante } from '@/modules/eneagrama/queries'
import { rutaDeRol } from './rol'
import type { RolUsuario, SessionUser } from '@/lib/types/domain'

/**
 * Exige que la sesión sea de un rol determinado; si no, manda al tablero que sí
 * le corresponde. Lo usan los layouts de los tres grupos autenticados.
 *
 * Qué es y qué no es: un layout NO se vuelve a renderizar en cada navegación
 * dentro de su propio árbol (partial rendering), así que este chequeo no es la
 * frontera de autorización — es una red de contención. La frontera de verdad
 * son, en este orden:
 *
 *   1. `proxy.ts`, que corre en cada request (las navegaciones del cliente
 *      también, porque piden el payload RSC por HTTP) y compara el rol contra
 *      el prefijo de la ruta.
 *   2. Cada server action y cada query, que vuelven a verificar por su cuenta.
 *   3. Las policies RLS de la base.
 *
 * Sirve igual: si alguien toca el matcher del proxy o agrega un grupo nuevo, la
 * pantalla no se dibuja igual.
 *
 * No se usa `forbidden()` de Next porque es experimental (pide el flag
 * `authInterrupts`) y porque un 403 sería peor experiencia que llevar a la
 * persona a la pantalla que sí puede ver.
 */
export async function requireRol(esperado: RolUsuario): Promise<SessionUser> {
  const session = await verifySession()
  if (session.rol !== esperado) {
    redirect(rutaDeRol(session.rol) ?? '/iniciar-sesion')
  }
  return session
}

/**
 * Guard del reclutador: sin ninguna empresa cargada no hay nada que gestionar
 * ni candidatos que ver, así que toda sección (salvo onboarding y mi-perfil)
 * manda al onboarding. Mismo criterio que el bloqueo del sidebar en el layout.
 */
export async function requireEmpresaCargada() {
  const empresas = await getMisEmpresasBase()
  if (empresas.length === 0) {
    redirect('/reclutador/onboarding')
  }
}

/**
 * Guard para el flujo de onboarding del postulante.
 * Uso: llamar desde cualquier page del postulante que requiera Eneagrama completo.
 * - Si no tiene perfil básico → /postulante/onboarding
 * - Si no tiene Eneagrama completo → /postulante/eneagrama
 *
 * Las lecturas de perfil y test son las memoizadas que comparte con el layout
 * del área y con la page: no suma consultas al render.
 */
export async function requireEneagramaCompleto() {
  const session = await verifySession()
  if (session.rol !== 'POSTULANTE') return

  // Verificar perfil básico
  const perfil = await getPerfilPostulanteActual()

  if (!perfil) {
    redirect('/postulante/onboarding')
  }

  // Verificar Eneagrama completado: debe existir al menos un dominante
  const test = await getTestEneagramaDePostulante(perfil.id)
  if (!test || test.test_eneagrama_dominante.length === 0) {
    redirect('/postulante/eneagrama')
  }
}
