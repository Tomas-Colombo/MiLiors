/**
 * Helper de paginación in-memory para server components.
 *
 * Vive en su propio módulo (sin 'use client') porque los primitivos de UI de
 * listado están en un módulo cliente y Next no permite llamar una función
 * exportada desde un módulo 'use client' dentro de un server component.
 */

export const PAGE_SIZE = 10

export function paginar<T>(rows: T[], rawPage: string | undefined, pageSize = PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const page = Math.min(Math.max(1, Number(rawPage) || 1), pageCount)
  const slice = rows.slice((page - 1) * pageSize, page * pageSize)
  return { page, pageCount, slice }
}
