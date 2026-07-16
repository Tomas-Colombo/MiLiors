'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { hrefConFiltros } from '@/lib/filter-memory'

/**
 * Enlace "Volver" hacia un listado, que restaura los filtros con los que el usuario lo dejó
 * (ver lib/filter-memory.ts). Para volver a cualquier otro lado alcanza con un <Link> común.
 *
 * El href queda siempre sin query y la memoria se lee recién al navegar, así el marcado del
 * servidor y el del cliente coinciden. onNavigate corre solo en navegación del lado del
 * cliente, de modo que abrir en una pestaña nueva sigue llevando al listado sin filtrar.
 */
export function VolverLink({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: React.ReactNode
}) {
  const router = useRouter()

  return (
    <Link
      href={href}
      className={className}
      onNavigate={(e) => {
        const destino = hrefConFiltros(href)
        if (destino === href) return
        e.preventDefault()
        router.push(destino)
      }}
    >
      {children}
    </Link>
  )
}
