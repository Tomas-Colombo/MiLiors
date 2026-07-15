/**
 * Política de sesiones por rol — fuente única de constantes.
 *
 * Estas reglas viven POR ENCIMA de Supabase Auth: no alteran la expiración ni
 * el refresh de tokens (eso lo maneja Supabase). Sólo deciden cuándo la app
 * dispara el `signOut()` nativo.
 *
 * ⚠️ El límite de inactividad del admin está espejado como `interval '1 hour'`
 * en la RPC `check_session()` (migración 20260715000000_sesion_actividad.sql).
 * Si cambiás uno, cambiá el otro.
 */
export const SESSION_POLICY = {
  ADMIN: {
    /** Cierre tras 1 hora de inactividad. */
    inactivityLimitMs: 60 * 60 * 1000,
    /** Mostrar el aviso "¿Seguís ahí?" 5 min antes del cierre (a los 55 min). */
    warningBeforeMs: 5 * 60 * 1000,
  },
  /** El cliente no envía heartbeat al server más de una vez cada 2 min. */
  heartbeatIntervalMs: 2 * 60 * 1000,
  /** Cada cuánto el watcher del cliente reevalúa la inactividad. */
  checkIntervalMs: 1000,
} as const
