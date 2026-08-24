import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from './dal'
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
    redirect(rutaDeRol(session.rol) ?? '/login')
  }
  return session
}

/**
 * Guard para el flujo de onboarding del postulante.
 * Uso: llamar desde cualquier page del postulante que requiera Eneagrama completo.
 * - Si no tiene perfil básico → /postulante/onboarding
 * - Si no tiene Eneagrama completo → /postulante/eneagrama
 */
export async function requireEneagramaCompleto() {
  const session = await verifySession()
  if (session.rol !== 'POSTULANTE') return

  const supabase = await createClient()

  // Verificar perfil básico
  const { data: perfil } = await supabase
    .from('perfil_postulante')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!perfil) {
    redirect('/postulante/onboarding')
  }

  // Verificar Eneagrama completado: debe existir al menos un dominante
  const { data: test } = await supabase
    .from('test_eneagrama')
    .select('id, test_eneagrama_dominante(id)')
    .eq('postulante_id', (perfil as { id: string }).id)
    .single()

  const testTyped = test as { id: string; test_eneagrama_dominante: { id: string }[] } | null
  if (!testTyped || testTyped.test_eneagrama_dominante.length === 0) {
    redirect('/postulante/eneagrama')
  }
}
