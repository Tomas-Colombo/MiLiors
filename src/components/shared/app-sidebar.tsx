'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LogOutIcon,
  SettingsIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
} from '@/components/icons'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { BrandLogo } from '@/components/shared/brand-logo'
import { MobileNav } from '@/components/shared/mobile-nav'
import { isNavActive, useCerrarSesion, type NavLinkItem } from '@/components/shared/nav-shared'
import { SIDEBAR_COLLAPSED_COOKIE, SIDEBAR_COLLAPSED_MAX_AGE } from '@/lib/sidebar-prefs'

export type { NavLinkItem }

type Props = {
  items: NavLinkItem[]
  userEmail: string
  rolLabel: string
  settingsHref?: string
  /** Si viene, los ítems del nav no navegan y este texto explica por qué. */
  navBloqueado?: string
  /**
   * Estado inicial de la barra retraída, leído de la cookie en el servidor.
   * Servidor y primer render del cliente parten del mismo valor, así no hay
   * salto de ancho al hidratar.
   */
  defaultCollapsed?: boolean
}

/**
 * Navegación de las áreas autenticadas. Desde `md` es la barra lateral fija
 * (retraíble); por debajo de `md` esa barra se oculta y la reemplaza la barra
 * inferior con la hoja "Más" (`MobileNav`). Los dos comparten ítems, criterio
 * de ítem activo y cierre de sesión (`nav-shared`).
 */
export function AppSidebar({
  items,
  userEmail,
  rolLabel,
  settingsHref,
  navBloqueado,
  defaultCollapsed = false,
}: Props) {
  return (
    <>
      <DesktopSidebar
        items={items}
        userEmail={userEmail}
        rolLabel={rolLabel}
        settingsHref={settingsHref}
        navBloqueado={navBloqueado}
        defaultCollapsed={defaultCollapsed}
      />
      <MobileNav
        items={items}
        userEmail={userEmail}
        rolLabel={rolLabel}
        settingsHref={settingsHref}
        navBloqueado={navBloqueado}
      />
    </>
  )
}

function DesktopSidebar({
  items,
  userEmail,
  rolLabel,
  settingsHref,
  navBloqueado,
  defaultCollapsed,
}: Props & { defaultCollapsed: boolean }) {
  const pathname = usePathname()
  const { isPending, handleLogout } = useCerrarSesion()
  const [collapsed, setCollapsed] = useState(defaultCollapsed)

  function toggleCollapsed() {
    const next = !collapsed
    setCollapsed(next)
    try {
      document.cookie = `${SIDEBAR_COLLAPSED_COOKIE}=${next}; path=/; max-age=${SIDEBAR_COLLAPSED_MAX_AGE}; samesite=lax`
    } catch {
      // Sin cookies la preferencia no persiste, pero la barra igual se retrae.
    }
  }

  return (
    <aside
      className={[
        // Debajo de `md` la reemplaza la barra inferior (MobileNav).
        'app-sidebar hidden flex-none flex-col h-screen sticky top-0 py-5 md:flex',
        collapsed ? 'w-[72px] px-2' : 'w-56 px-3',
      ].join(' ')}
    >
      {/* Brand + colapsar */}
      <div className={['mb-6 flex flex-none items-center px-1', collapsed ? 'flex-col gap-3' : 'justify-between gap-2'].join(' ')}>
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

      {/* Nav. `min-h-0` + scroll propio: con los ~12 ítems del admin la lista
          scrollea y el footer queda siempre a la vista. El `-m-1 p-1` deja
          lugar al aro de foco, que el overflow recortaría. */}
      <nav className="no-scrollbar -m-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden p-1">
        {navBloqueado && !collapsed && (
          <p className="app-sidebar__muted mb-2 px-3 text-2xs leading-snug">
            {navBloqueado}
          </p>
        )}
        {items.map((item) => {
          const active = isNavActive(pathname, item)
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
        className={['flex-none border-t border-[color:var(--sidebar-border)] pt-4 space-y-3', collapsed ? 'px-1' : 'px-3'].join(' ')}
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
