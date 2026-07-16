'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { guardarFiltros } from '@/lib/filter-memory'

/**
 * Recuerda la query string de cada ruta visitada (ver lib/filter-memory.ts).
 *
 * Va montado una sola vez por layout de rol, al lado de {children}. No le importa quién
 * escribió la URL, y por eso cubre tanto las vistas que usan list-controls.tsx como las que
 * arman sus filtros por su cuenta, sin tener que tocar ninguna.
 *
 * Necesita un <Suspense> alrededor, por useSearchParams.
 */
export function FilterMemory() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    guardarFiltros(pathname, searchParams.toString())
  }, [pathname, searchParams])

  return null
}
