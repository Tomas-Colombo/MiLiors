/**
 * Une clases condicionalmente, descartando valores falsy.
 * Equivalente minimalista a `clsx` sin dependencias externas.
 */
export type ClassValue = string | number | bigint | false | null | undefined;

export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Expresión regular canónica para validación de UUID v4 (case-insensitive).
 * Compartida entre queries de postulantes, verificación y acciones de puestos.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Valida si un string cumple con el formato estándar de UUID (v1 a v5).
 * Distingue UUIDs reales de sentinelas como 'OTRAS'.
 */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
