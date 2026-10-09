'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSyncExternalStore, useTransition } from 'react'
import {
  LogOutIcon,
  SettingsIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
} from '@/components/icons'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { BrandLogo } from '@/components/shared/brand-logo'
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
  /** Si viene, los ítems del nav no navegan y este texto explica por qué. */
  navBloqueado?: string
}

const COLLAPSE_STORAGE_KEY = 'miliors-sidebar-collapsed'
const COLLAPSE_CHANGE_EVENT = 'miliors-sidebar-collapse-change'

function subscribeCollapsed(callback: () => void) {
  window.addEventListener(COLLAPSE_CHANGE_EVENT, callback)
  return () => window.removeEventListener(COLLAPSE_CHANGE_EVENT, callback)
}

function getCollapsedSnapshot() {
  try {
    return localStorage.getItem(COLLAPSE_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

// La barra arranca expandida en el servidor; recién al montar en el cliente
// se sincroniza con la preferencia guardada (sin necesidad de un efecto que
// dispare setState).
function getCollapsedServerSnapshot() {
  return false
}

export function AppSidebar({ items, userEmail, rolLabel, settingsHref, navBloqueado }: Props) {
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const collapsed = useSyncExternalStore(subscribeCollapsed, getCollapsedSnapshot, getCollapsedServerSnapshot)

  function toggleCollapsed() {
    const next = !collapsed
    try {
      localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next))
    } catch {
      // no-op
    }
    window.dispatchEvent(new Event(COLLAPSE_CHANGE_EVENT))
  }

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
      className={[
        'app-sidebar flex flex-none flex-col h-screen sticky top-0 py-5',
        collapsed ? 'w-[72px] px-2' : 'w-56 px-3',
      ].join(' ')}
    >
      {/* Brand + colapsar */}
      <div className={['mb-6 flex items-center px-1', collapsed ? 'flex-col gap-3' : 'justify-between gap-2'].join(' ')}>
        <div className="flex min-w-0 items-center gap-2.5 px-2">
          <BrandLogo size={40} />
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-heading text-compact font-extrabold tracking-tight text-white">
                MiLiors
              </div>
              <div className="app-sidebar__muted truncate text-2xs font-medium">
                {rolLabel}
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expandir barra lateral' : 'Retraer barra lateral'}
          title={collapsed ? 'Expandir barra lateral' : 'Retraer barra lateral'}
          className="app-sidebar__btn app-sidebar__btn--tile flex-none rounded-md p-1.5"
        >
          {collapsed ? <PanelLeftOpenIcon size={16} /> : <PanelLeftCloseIcon size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {navBloqueado && !collapsed && (
          <p className="app-sidebar__muted mb-2 px-3 text-2xs leading-snug">
            {navBloqueado}
          </p>
        )}
        {items.map((item) => {
          const active = isActive(item)
          if (navBloqueado) {
            return (
              <span
                key={item.href}
                aria-disabled="true"
                title={navBloqueado}
                className={[
                  'app-sidebar__muted flex cursor-not-allowed items-center rounded-md py-2.5 text-sm font-medium opacity-45',
                  collapsed ? 'justify-center px-2' : 'gap-3 px-3',
                ].join(' ')}
              >
                <span className="flex-none">{item.icon}</span>
                {!collapsed && <span className="flex-1">{item.label}</span>}
              </span>
            )
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              title={collapsed ? item.label : undefined}
              className={[
                // Colores de reposo, hover y activo (aria-current): globals.css, sección Sidebar.
                'app-sidebar__link flex items-center rounded-md py-2.5 text-sm',
                collapsed ? 'justify-center px-2' : 'gap-3 px-3',
              ].join(' ')}
            >
              <span className="app-sidebar__link-icon relative flex-none">
                {item.icon}
                {item.badge && collapsed && (
                  <span
                    className="absolute -right-0.5 -top-0.5 flex h-2 w-2 rounded-full bg-red-400"
                    aria-label="Requiere atención"
                  />
                )}
              </span>
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="flex h-2 w-2 rounded-full bg-red-400" aria-label="Requiere atención" />
                  )}
                </>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div
        className={['border-t border-[color:var(--sidebar-border)] pt-4 space-y-3', collapsed ? 'px-1' : 'px-3'].join(' ')}
      >
        {!collapsed && (
          <div>
            <div className="flex items-center gap-1.5">
              <p className="app-sidebar__strong text-2xs font-semibold truncate">
                {userEmail}
              </p>
              {settingsHref && (
                <Link
                  href={settingsHref}
                  aria-label="Configuración de perfil"
                  className="flex-none rounded-sm transition-colors"
                  style={{ color: pathname.startsWith(settingsHref) ? 'var(--color-accent-light)' : 'var(--sidebar-item-text)' }}
                >
                  <SettingsIcon size={13} />
                </Link>
              )}
            </div>
            <p className="app-sidebar__muted text-2xs">
              {rolLabel}
            </p>
          </div>
        )}

        {collapsed && settingsHref && (
          <Link
            href={settingsHref}
            aria-label="Configuración de perfil"
            title="Configuración de perfil"
            className="flex justify-center rounded-sm transition-colors"
            style={{ color: pathname.startsWith(settingsHref) ? 'var(--color-accent-light)' : 'var(--sidebar-item-text)' }}
          >
            <SettingsIcon size={16} />
          </Link>
        )}

        <ThemeToggle
          iconOnly={collapsed}
          className={[
            'app-sidebar__btn flex items-center rounded-sm text-xs font-medium disabled:opacity-50',
            collapsed ? 'justify-center w-full' : 'gap-2',
          ].join(' ')}
        />

        <button
          type="button"
          onClick={handleLogout}
          disabled={isPending}
          title={collapsed ? 'Cerrar sesión' : undefined}
          className={[
            'app-sidebar__btn app-sidebar__btn--danger flex items-center rounded-sm text-xs font-medium disabled:opacity-50',
            collapsed ? 'justify-center w-full' : 'gap-2',
          ].join(' ')}
        >
          <LogOutIcon size={14} />
          {!collapsed && (isPending ? 'Cerrando sesión...' : 'Cerrar sesión')}
        </button>
      </div>
    </aside>
  )
}
