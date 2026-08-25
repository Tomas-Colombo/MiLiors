/**
 * Formato de las fechas del perfil técnico, que son mes + año sin día.
 *
 * Esto es sólo para MOSTRAR. La conversión entre lo que se tipea (MM/AAAA) y lo
 * que viaja al server (YYYY-MM) vive con el campo que la usa, en
 * `components/ui/month-year-input.tsx`.
 */

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

/** `'2024-03'` → `'Marzo 2024'`. Devuelve la entrada tal cual si no la entiende. */
export function formatMesAnio(fecha: string | null | undefined): string | null {
  if (!fecha) return null
  const [year, month] = fecha.split('-')
  if (!year || !month) return fecha
  const mes = MESES[parseInt(month, 10) - 1]
  const mesLabel = mes ? mes.charAt(0).toUpperCase() + mes.slice(1) : ''
  return mesLabel ? `${mesLabel} ${year}` : fecha
}
