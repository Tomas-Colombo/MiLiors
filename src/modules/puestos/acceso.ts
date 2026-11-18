import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { getSessionUser } from '@/lib/dal'

/**
 * Token de enlace de un puesto: 24 bytes en base64url sin padding = 32 caracteres.
 * Se valida el formato antes de consultar para no mandar basura a la base.
 */
const TOKEN_ENLACE_REGEX = /^[A-Za-z0-9_-]{32}$/

export function esTokenEnlaceValido(token: unknown): token is string {
  return typeof token === 'string' && TOKEN_ENLACE_REGEX.test(token)
}

export type AccesoPuesto = { via: 'publico' | 'enlace' | 'postulado' }

/**
 * Single source of truth for "can this postulante see/apply to this puesto?".
 *
 * - `publico`: the puesto is activo, not dado de baja and PUBLICA. Evaluated
 *   explicitly (not just "RLS returned the row"): RLS also exposes private puestos
 *   to their owner, to admins and to whoever already applied.
 * - `enlace`: `enlace` is the token of THIS puesto (checked with service role; a
 *   valid token of another puesto grants nothing) and the puesto was not dado de baja.
 * - `postulado`: the current user already has a postulacion on this puesto (D6).
 * - `null`: no access, the caller answers not found / "no disponible".
 *
 * Access via `enlace` does not go through RLS: after a positive answer the caller
 * reads with service role.
 */
export async function resolverAccesoPuesto(
  puestoId: string,
  enlace?: string | null,
): Promise<AccesoPuesto | null> {
  const supabase = await createClient()

  const { data: puesto } = await supabase
    .from('puesto')
    .select('id, activo, visibilidad, fecha_baja_puesto')
    .eq('id', puestoId)
    .maybeSingle()

  const p = puesto as {
    activo: boolean
    visibilidad: 'PUBLICA' | 'PRIVADA'
    fecha_baja_puesto: string | null
  } | null

  if (p && p.activo && p.visibilidad === 'PUBLICA' && p.fecha_baja_puesto === null) {
    return { via: 'publico' }
  }

  if (esTokenEnlaceValido(enlace)) {
    const admin = createAdminClient()
    const { data } = await admin
      .from('puesto_enlace')
      .select('puesto_id, puesto!inner(fecha_baja_puesto)')
      .eq('token', enlace)
      .eq('puesto_id', puestoId)
      .is('puesto.fecha_baja_puesto', null)
      .maybeSingle()

    if (data) return { via: 'enlace' }
  }

  const user = await getSessionUser()
  if (user) {
    const { data } = await supabase
      .from('postulacion')
      .select('id, perfil_postulante!inner(usuario_id)')
      .eq('puesto_id', puestoId)
      .eq('perfil_postulante.usuario_id', user.id)
      .limit(1)

    if ((data ?? []).length > 0) return { via: 'postulado' }
  }

  return null
}
