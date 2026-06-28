'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTransition } from 'react'
import { SparklesIcon, LogOutIcon, SettingsIcon } from '@/components/icons'
import { cerrarSesion } from '@/modules/auth/actions'

export type NavLinkItem = {
  href: string
  label: string
  icon: React.ReactNode
  exactMatch?: boolean
  badge?: boolean
}

type Props = {
  items: NavLinkItem[]
  userEmail: string
  rolLabel: string
  settingsHref?: string
}

export function AppSidebar({ items, userEmail, rolLabel, settingsHref }: Props) {
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
    <aside
      className="flex w-56 flex-none flex-col px-3 py-5 h-screen sticky top-0"
      style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}
    >
      {/* Brand */}
      <div className="mb-6 flex items-center gap-2.5 px-3">
        <div
          className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px]"
          style={{ background: 'var(--sidebar-logo-gradient)', boxShadow: '0 4px 12px rgba(91,79,232,0.4)' }}
        >
          <SparklesIcon size={16} className="text-white" />
        </div>
        <div>
          <div
            className="text-[13.5px] font-extrabold tracking-tight text-white"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            TalentID
          </div>
          <div className="text-[10px] font-medium" style={{ color: 'var(--sidebar-item-text)' }}>
            {rolLabel}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {items.map((item) => {
          const active = isActive(item)
          return (
            <a
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className="flex items-center gap-3 rounded-[9px] px-3 py-2.5 text-sm font-medium transition-colors"
              style={{
                background: active ? 'var(--sidebar-item-active-bg)' : 'transparent',
                color: active ? 'var(--sidebar-item-text-active)' : 'var(--sidebar-item-text)',
                fontWeight: active ? 600 : 500,
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'var(--sidebar-item-hover-bg)'
                  e.currentTarget.style.color = 'var(--sidebar-item-text-active)'
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--sidebar-item-text)'
                }
              }}
            >
              <span
                className="flex-none"
                style={{ color: active ? 'var(--sidebar-item-text-active)' : 'var(--sidebar-item-text)' }}
              >
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="flex h-2 w-2 rounded-full bg-red-400" aria-label="Requiere atención" />
              )}
            </a>
          )
        })}
      </nav>

      {/* Footer */}
      <div
        className="pt-4 px-3 space-y-3"
        style={{ borderTop: '1px solid var(--sidebar-border)' }}
      >
        <div>
          <div className="flex items-center gap-1.5">
            <p
              className="text-[11.5px] font-semibold truncate"
              style={{ color: 'var(--sidebar-item-text-active)' }}
            >
              {userEmail}
            </p>
            {settingsHref && (
              <Link
                href={settingsHref}
                aria-label="Configuración de perfil"
                className="flex-none transition-colors"
                style={{ color: pathname.startsWith(settingsHref) ? '#8B7FFF' : 'var(--sidebar-item-text)' }}
              >
                <SettingsIcon size={13} />
              </Link>
            )}
          </div>
          <p className="text-[11px]" style={{ color: 'var(--sidebar-item-text)' }}>
            {rolLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isPending}
          className="flex items-center gap-2 text-xs font-medium transition-colors disabled:opacity-50"
          style={{ color: 'var(--sidebar-item-text)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--sidebar-item-text)' }}
        >
          <LogOutIcon size={14} />
          {isPending ? 'Cerrando sesión...' : 'Cerrar sesión'}
        </button>
      </div>
    </aside>
  )
}
