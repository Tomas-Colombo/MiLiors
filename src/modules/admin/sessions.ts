'use server'

import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import type { ActionResult } from '@/lib/types/domain'

// Guard ADMIN (mismo criterio que src/modules/admin/actions.ts)
async function requireAdmin() {
  const session = await verifySession()
  if (session.rol !== 'ADMIN') throw new Error('Acceso denegado.')
  return session
}

/**
 * Revoca la sesión de un usuario (cualquier rol).
 *
 * Marca `revocada = true` en sesion_actividad: en el próximo request del usuario,
 * el proxy detecta el flag vía check_session() y ejecuta el signOut() nativo
 * sobre SU propia sesión (matando también sus refresh tokens en Supabase).
 *
 * Límite conocido de Supabase: un access token ya emitido no se puede invalidar
 * hasta que expira. Con el JWT global en 5 min, la ventana máxima de un token
 * vigente para llamadas directas a Supabase (RLS) que no pasan por el proxy es
 * de 5 min. El flag corta de inmediato todo lo que sí pasa por el proxy
 * (páginas y route handlers).
 */
export async function revocarSesion(userId: string): Promise<ActionResult> {
  await requireAdmin()
  if (!userId) return { success: false, error: 'Usuario inválido.' }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('sesion_actividad') as any).upsert({
    usuario_id: userId,
    revocada: true,
    actualizado_en: new Date().toISOString(),
  })
  if (error) return { success: false, error: 'No se pudo revocar la sesión.' }

  return { success: true, data: undefined }
}
