import type { SupabaseClient } from '@supabase/supabase-js'

export type UsuarioAutenticado = {
  id: string
  email: string | undefined
  app_metadata: Record<string, unknown>
}

/**
 * Identifica al usuario autenticado a partir del JWT de la sesión.
 *
 * Usa `getClaims()` en lugar de `getUser()`: el proyecto firma los access
 * tokens con clave asimétrica (ES256), así que la firma se verifica localmente
 * contra el JWKS (auth-js lo cachea a nivel de proceso durante 10 minutos), sin
 * ida y vuelta a Supabase Auth. `getUser()` consultaba Auth + Postgres en cada
 * request y fue la llamada más frecuente durante la lentitud del 2026-10-20.
 *
 * Contrapartida: los claims son una foto del momento en que se emitió el token
 * (el JWT del proyecto dura 5 min). Un usuario borrado o baneado conserva un token válido hasta que
 * vence; la revocación la aplica aparte la RPC `check_session` del proxy.
 *
 * Igual que `getUser()`, `getClaims()` refresca una sesión vencida a través del
 * adaptador de cookies del cliente.
 */
export async function getUsuarioAutenticado(
  supabase: { auth: Pick<SupabaseClient['auth'], 'getClaims'> },
): Promise<UsuarioAutenticado | null> {
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data) return null

  const { sub, email, app_metadata } = data.claims
  return { id: sub, email, app_metadata: app_metadata ?? {} }
}
