import { ROL_USUARIO, RUTAS_POR_ROL } from '@/lib/constants/enums'
import type { RolUsuario } from '@/lib/types/domain'

/**
 * Lee el rol del usuario autenticado.
 *
 * El rol vive en `app_metadata`, NO en `user_metadata`. `user_metadata` lo puede
 * reescribir el propio usuario desde el navegador con la anon key
 * (`supabase.auth.updateUser({ data: { rol: 'ADMIN' } })`), así que confiar en
 * él era regalar el panel de administración. `app_metadata` sólo se escribe
 * con la service role key; ahí lo mantiene sincronizado el trigger
 * `trg_usuario_sync_rol_metadata` a partir de `usuario.rol_usuario`, que es la
 * fuente de verdad (ver migración 20260824000002_rol_no_editable.sql).
 *
 * Devuelve null si no hay rol o si no es uno de los tres conocidos: quien llama
 * decide qué hacer (redirigir, 403). Nunca se asume un rol por defecto.
 */
export function rolDeUsuario(
  user: { app_metadata?: Record<string, unknown> | null } | null | undefined,
): RolUsuario | null {
  const rol = user?.app_metadata?.rol
  if (typeof rol !== 'string') return null
  return rol in ROL_USUARIO ? (rol as RolUsuario) : null
}

/** Dashboard de entrada del rol, o null si el rol no es utilizable. */
export function rutaDeRol(rol: RolUsuario | null): string | null {
  return rol ? (RUTAS_POR_ROL[rol] ?? null) : null
}
