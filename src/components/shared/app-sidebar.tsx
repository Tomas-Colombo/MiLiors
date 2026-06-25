'use client'

import { usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { NavItem } from '@/components/ui'
import { SparklesIcon, LogOutIcon } from '@/components/icons'
import { cerrarSesion } from '@/modules/auth/actions'

export type NavLinkItem = {
  href: string
  label: string
  icon: React.ReactNode
  /** If true, only active on exact match; otherwise uses startsWith. */
  exactMatch?: boolean
  /** If true, shows a red dot indicating something requires attention. */
  badge?: boolean
}

type Props = {
  items: NavLinkItem[]
  userEmail: string
  rolLabel: string
}

export function AppSidebar({ items, userEmail, rolLabel }: Props) {
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  function isActive(item: NavLinkItem) {
    if (item.exactMatch) return pathname === item.href
    return pathname === item.href || pathname.startsWith(item.href + '/')
  }

  function handleLogout() {
    startTransition(async () => {
      await cerrarSesion()
    })
  }

  return (
    <aside className="flex w-56 flex-none flex-col border-r border-neutral-200 bg-surface px-3 py-5 h-screen sticky top-0">
      {/* Brand */}
      <div className="mb-6 flex items-center gap-2.5 px-3">
        <div
          className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] shadow-primary"
          style={{ background: 'var(--gradient-brand-soft)' }}
        >
          <SparklesIcon size={16} className="text-white" />
        </div>
        <div>
          <div className="text-[13.5px] font-extrabold tracking-tight text-ink">TalentID</div>
          <div className="text-[10px] font-medium text-neutral-400">{rolLabel}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {items.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            icon={item.icon}
            label={item.label}
            active={isActive(item)}
            trailing={item.badge ? (
              <span className="flex h-2 w-2 rounded-full bg-red-500" aria-label="Requiere atención" />
            ) : undefined}
          />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-neutral-100 pt-4 px-3 space-y-3">
        <div>
          <p className="text-[11.5px] font-semibold text-ink-soft truncate">{userEmail}</p>
          <p className="text-[11px] text-neutral-400">{rolLabel}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isPending}
          className="flex items-center gap-2 text-xs font-medium text-muted hover:text-error transition-colors disabled:opacity-50"
        >
          <LogOutIcon size={14} />
          {isPending ? 'Cerrando sesión...' : 'Cerrar sesión'}
        </button>
      </div>
    </aside>
  )
}
