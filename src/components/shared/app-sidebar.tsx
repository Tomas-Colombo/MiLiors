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
import { borrarFiltros, hrefConFiltros } from '@/lib/filter-memory'
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

export function AppSidebar({ items, userEmail, rolLabel, settingsHref }: Props) {
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

  // Vuelve al listado con los filtros que el usuario dejó puestos (ver lib/filter-memory.ts).
  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, item: NavLinkItem) {
    // Con modificadores el navegador abre otra pestaña o ventana: que llegue sin filtrar.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return

    // Clickear la vista en la que ya estamos significa "empezar de nuevo". El match tiene que
    // ser exacto, no isActive(): parados en un detalle (/reclutador/postulantes/:id) el ítem
    // del listado figura activo por prefijo, y ahí el click tiene que restaurar, no borrar.
    if (pathname === item.href) {
      borrarFiltros(item.href)
      return
    }

    const destino = hrefConFiltros(item.href)
    if (destino === item.href) return
    e.preventDefault()
    window.location.assign(destino)
  }

  function handleLogout() {
    startTransition(async () => {
      await cerrarSesion()
    })
  }

  return (
    <aside
      className={[
        'flex flex-none flex-col h-screen sticky top-0 py-5 transition-[width] duration-200 ease-out',
        collapsed ? 'w-[72px] px-2' : 'w-56 px-3',
      ].join(' ')}
      style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}
    >
      {/* Brand + colapsar */}
      <div className={['mb-6 flex items-center px-1', collapsed ? 'flex-col gap-3' : 'justify-between gap-2'].join(' ')}>
        <div className="flex min-w-0 items-center gap-2.5 px-2">
          <BrandLogo size={40} />
          {!collapsed && (
            <div className="min-w-0">
              <div
                className="text-[13.5px] font-extrabold tracking-tight text-white"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                MiLiors
              </div>
              <div className="truncate text-[10px] font-medium" style={{ color: 'var(--sidebar-item-text)' }}>
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
          className="flex-none rounded-[7px] p-1.5 transition-colors"
          style={{ color: 'var(--sidebar-item-text)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--sidebar-item-hover-bg)'
            e.currentTarget.style.color = 'var(--sidebar-item-text-active)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--sidebar-item-text)'
          }}
        >
          {collapsed ? <PanelLeftOpenIcon size={16} /> : <PanelLeftCloseIcon size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 flex-1">
        {items.map((item) => {
          const active = isActive(item)
          return (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => handleNavClick(e, item)}
              aria-current={active ? 'page' : undefined}
              title={collapsed ? item.label : undefined}
              className={[
                'flex items-center rounded-[9px] py-2.5 text-sm font-medium transition-colors',
                collapsed ? 'justify-center px-2' : 'gap-3 px-3',
              ].join(' ')}
              style={{
                background: active ? 'var(--sidebar-item-active-bg)' : 'transparent',
                // El aro interno es lo que despega el ítem activo del fondo de
                // la barra sin sumarle un borde que corra el layout.
                boxShadow: active ? 'inset 0 0 0 1px var(--sidebar-item-active-ring)' : 'none',
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
                className="relative flex-none"
                style={{ color: active ? 'var(--sidebar-icon-active)' : 'var(--sidebar-item-text)' }}
              >
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
            </a>
          )
        })}
      </nav>

      {/* Footer */}
      <div
        className={['pt-4 space-y-3', collapsed ? 'px-1' : 'px-3'].join(' ')}
        style={{ borderTop: '1px solid var(--sidebar-border)' }}
      >
        {!collapsed && (
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
                  style={{ color: pathname.startsWith(settingsHref) ? 'var(--color-accent-light)' : 'var(--sidebar-item-text)' }}
                >
                  <SettingsIcon size={13} />
                </Link>
              )}
            </div>
            <p className="text-[11px]" style={{ color: 'var(--sidebar-item-text)' }}>
              {rolLabel}
            </p>
          </div>
        )}

        {collapsed && settingsHref && (
          <Link
            href={settingsHref}
            aria-label="Configuración de perfil"
            title="Configuración de perfil"
            className="flex justify-center transition-colors"
            style={{ color: pathname.startsWith(settingsHref) ? 'var(--color-accent-light)' : 'var(--sidebar-item-text)' }}
          >
            <SettingsIcon size={16} />
          </Link>
        )}

        <ThemeToggle
          iconOnly={collapsed}
          className={[
            'flex items-center text-xs font-medium transition-colors disabled:opacity-50',
            collapsed ? 'justify-center w-full' : 'gap-2',
          ].join(' ')}
        />

        <button
          type="button"
          onClick={handleLogout}
          disabled={isPending}
          title={collapsed ? 'Cerrar sesión' : undefined}
          className={[
            'flex items-center text-xs font-medium transition-colors disabled:opacity-50',
            collapsed ? 'justify-center w-full' : 'gap-2',
          ].join(' ')}
          style={{ color: 'var(--sidebar-item-text)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#f87171' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--sidebar-item-text)' }}
        >
          <LogOutIcon size={14} />
          {!collapsed && (isPending ? 'Cerrando sesión...' : 'Cerrar sesión')}
        </button>
      </div>
    </aside>
  )
}
