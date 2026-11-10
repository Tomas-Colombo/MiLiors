import 'server-only'

export interface AuditoriaParams {
  usuarioId: string
  accion: string
  entidad: string
  entidadId: string
  detalle?: Record<string, string | number | boolean | null>
}

/**
 * Emite una línea JSON de auditoría a console.info.
 *
 * PROHIBIDO loguear emails, nombres, contenido de notas, textos de TyC
 * o cualquier dato personal: solo ids, acciones y valores de configuración.
 */
export function logAuditoria({
  usuarioId,
  accion,
  entidad,
  entidadId,
  detalle,
}: AuditoriaParams): void {
  const ts = new Date().toISOString()
  const payload: Record<string, unknown> = {
    nivel: 'INFO',
    tipo: 'auditoria',
    ts,
    usuarioId,
    accion,
    entidad,
    entidadId,
  }
  if (detalle !== undefined) {
    payload.detalle = detalle
  }
  console.info(JSON.stringify(payload))
}

/**
 * Emite una línea JSON de error a console.error.
 * Serializa únicamente `message` y `name` del error, nunca el objeto entero
 * para prevenir fugas de credenciales o payloads internos.
 */
export function logError(
  contexto: string,
  error: unknown,
  datos?: Record<string, string | number | boolean | null>
): void {
  const ts = new Date().toISOString()
  let errorObj: { name: string; message: string }
  if (error instanceof Error) {
    errorObj = {
      name: error.name,
      message: error.message,
    }
  } else if (typeof error === 'object' && error !== null) {
    const err = error as { name?: unknown; message?: unknown }
    errorObj = {
      name: typeof err.name === 'string' ? err.name : 'Error',
      message: typeof err.message === 'string' ? err.message : String(error),
    }
  } else {
    errorObj = {
      name: 'Error',
      message: String(error),
    }
  }

  const payload: Record<string, unknown> = {
    nivel: 'ERROR',
    tipo: 'error',
    ts,
    contexto,
    error: errorObj,
  }
  if (datos !== undefined) {
    payload.datos = datos
  }
  console.error(JSON.stringify(payload))
}
