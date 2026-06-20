/**
 * Une clases condicionalmente, descartando valores falsy.
 * Equivalente minimalista a `clsx` sin dependencias externas.
 */
export type ClassValue = string | number | bigint | false | null | undefined;

export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
