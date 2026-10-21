/**
 * Preferencia de barra lateral retraída. Vive en una cookie (y no en
 * localStorage) para que el servidor sepa el estado en el primer render y el
 * HTML llegue ya con el ancho correcto, sin el salto expandida → retraída al
 * hidratar. Sin `server-only` a propósito: lo importan el cliente (escribe) y
 * `sidebar-prefs-server.ts` (lee).
 */
export const SIDEBAR_COLLAPSED_COOKIE = 'miliors-sidebar-collapsed'

/** Un año: es una preferencia de interfaz, no una sesión. */
export const SIDEBAR_COLLAPSED_MAX_AGE = 60 * 60 * 24 * 365
