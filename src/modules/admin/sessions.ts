'use server'

import { createAdminClient } from '@/lib/supabase/server-admin'
import { requireAdmin } from '@/lib/guards'
import type { ActionResult } from '@/lib/types/domain'

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
 * de 5 min. El flag corta todo lo que sí pasa por el proxy (páginas y route
 * handlers) en hasta 60 s: el proxy cachea check_session() por usuario (ver
 * src/lib/session/check-session-cache.ts).
 */
export async function revocarSesion(userId: string): Promise<ActionResult> {
  await requireAdmin()
  if (!userId) return { success: false, error: 'Usuario inválido.' }

  const admin = createAdminClient()
  const { error } = await admin.from('sesion_actividad').upsert({
    usuario_id: userId,
    revocada: true,
    actualizado_en: new Date().toISOString(),
  })
  if (error) return { success: false, error: 'No se pudo revocar la sesión.' }

  return { success: true, data: undefined }
}
