'use client'

import { useTransition } from 'react'
import { cerrarSesion } from '@/modules/auth/actions'

export type NavLinkItem = {
  href: string
  label: string
  /** Etiqueta corta para la barra inferior en mobile; si falta se usa `label`. */
  shortLabel?: string
  icon: React.ReactNode
  exactMatch?: boolean
  badge?: boolean
  /** Entra en la barra inferior de mobile (máximo 4). Si ninguno lo marca, van los primeros 4. */
  primary?: boolean
}

/** Cuántos destinos entran en la barra inferior; el quinto lugar es "Más". */
const MAX_BARRA = 4

export function isNavActive(pathname: string, item: NavLinkItem) {
  if (item.exactMatch) return pathname === item.href
  return pathname === item.href || pathname.startsWith(item.href + '/')
}

/** Separa los ítems de la barra inferior de los que van a la hoja "Más". */
export function dividirNav(items: NavLinkItem[]) {
  const marcados = items.filter((i) => i.primary).slice(0, MAX_BARRA)
  const principales = marcados.length > 0 ? marcados : items.slice(0, MAX_BARRA)
  const resto = items.filter((i) => !principales.includes(i))
  return { principales, resto }
}

/** Cierre de sesión compartido por la barra lateral y la hoja de mobile. */
export function useCerrarSesion() {
  const [isPending, startTransition] = useTransition()

  function handleLogout() {
    startTransition(async () => {
      await cerrarSesion()
    })
  }

  return { isPending, handleLogout }
}
