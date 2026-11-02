/**
 * Helper canónico de formateo de fechas de MiLiors.
 *
 * Utilizable tanto en componentes de servidor como en componentes de cliente.
 *
 * Regla de zona horaria (H-217):
 * - Un valor de solo fecha (columna DATE de PostgreSQL, string 'YYYY-MM-DD' de 10 caracteres)
 *   carece de componente horario y representa un día civil o calendario. En la especificación
 *   ECMAScript, 'YYYY-MM-DD' se parsea como medianoche UTC (00:00:00Z). Si se formateara con
 *   la zona horaria local argentina (America/Argentina/Buenos_Aires, UTC-3), las 00:00Z se
 *   interpretarían a las 21:00 del día anterior, produciendo el bug de corrimiento de día
 *   (H-217). Por lo tanto, los valores de solo fecha se formatean siempre con timeZone: 'UTC'.
 * - Por el contrario, un timestamp con hora (TIMESTAMPTZ, string ISO 8601 con hora o instancia
 *   de Date) representa un instante exacto en el tiempo y debe proyectarse en el huso horario
 *   oficial de Argentina: timeZone: 'America/Argentina/Buenos_Aires'.
 * - Se permite sobreescribir la zona horaria en cualquier caso mediante el parámetro explícito
 *   `timeZone`.
 */

export type FormatoFecha =
  | 'larga'          // Ej: "1 de marzo de 2026" (predeterminado)
  | 'corta'          // Ej: "01/03/2026"
  | 'abreviada'      // Ej: "1 de mar de 2026"
  | 'con-hora'       // Ej: "01/03/2026, 12:30"
  | 'mes-anio'       // Ej: "marzo de 2026"
  | 'mes-anio-corto' // Ej: "mar 2026"

export interface OpcionesFecha {
  formato?: FormatoFecha
  timeZone?: string
}

const OPCIONES_FORMATO: Record<FormatoFecha, Intl.DateTimeFormatOptions> = {
  larga: { day: 'numeric', month: 'long', year: 'numeric' },
  corta: { day: '2-digit', month: '2-digit', year: 'numeric' },
  abreviada: { day: 'numeric', month: 'short', year: 'numeric' },
  'con-hora': {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  },
  'mes-anio': { month: 'long', year: 'numeric' },
  'mes-anio-corto': { month: 'short', year: 'numeric' },
}

const SOLO_FECHA_RE = /^\d{4}-\d{2}-\d{2}$/

export function formatFecha(
  fecha: string | Date | number | null | undefined,
  opciones?: FormatoFecha | OpcionesFecha,
): string {
  if (fecha === null || fecha === undefined || fecha === '') {
    return '—'
  }

  const formato: FormatoFecha =
    typeof opciones === 'string'
      ? opciones
      : (opciones?.formato ?? 'larga')

  const timeZoneExplicita =
    typeof opciones === 'object' ? opciones.timeZone : undefined

  const esSoloFecha = typeof fecha === 'string' && SOLO_FECHA_RE.test(fecha)
  const timeZone =
    timeZoneExplicita ?? (esSoloFecha ? 'UTC' : 'America/Argentina/Buenos_Aires')

  try {
    const d = typeof fecha === 'object' && fecha instanceof Date ? fecha : new Date(fecha)
    if (isNaN(d.getTime())) {
      return '—'
    }

    const formatOptions: Intl.DateTimeFormatOptions = {
      ...OPCIONES_FORMATO[formato],
      timeZone,
    }

    return d.toLocaleDateString('es-AR', formatOptions)
  } catch {
    return '—'
  }
}
