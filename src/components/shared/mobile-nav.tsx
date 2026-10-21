'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import { CloseIcon, LogOutIcon, MoreHorizontalIcon, SettingsIcon } from '@/components/icons'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { dividirNav, isNavActive, useCerrarSesion, type NavLinkItem } from '@/components/shared/nav-shared'
import { useDialogo } from '@/components/ui/use-dialogo'

type Props = {
  items: NavLinkItem[]
  userEmail: string
  rolLabel: string
  settingsHref?: string
  /** Si viene, los ítems no navegan y este texto explica por qué. */
  navBloqueado?: string
}

function PuntoAtencion({ className }: { className: string }) {
  return <span role="img" aria-label="Requiere atención" className={`absolute h-2 w-2 rounded-full bg-red-400 ${className}`} />
}

/**
 * Navegación por debajo de `md`: barra fija abajo (alcance del pulgar) con los
 * destinos principales y un quinto botón "Más" que abre una hoja con el resto
 * de los ítems y las acciones de cuenta (perfil, tema, cerrar sesión). Usa las
 * mismas superficies `--sidebar-*` que la barra lateral de escritorio.
 */
export function MobileNav({ items, userEmail, rolLabel, settingsHref, navBloqueado }: Props) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [rutaPrevia, setRutaPrevia] = useState(pathname)

  // Navegar (cualquier cambio de ruta) cierra la hoja. Ajustar el estado durante
  // el render evita un efecto que dispare un render extra con la hoja abierta.
  if (rutaPrevia !== pathname) {
    setRutaPrevia(pathname)
    setOpen(false)
  }

  // Si la ventana crece hasta `md` con la hoja abierta (rotar una tablet), la
  // hoja se oculta por CSS: hay que soltar también el bloqueo de scroll.
  useEffect(() => {
    if (!open) return
    const mq = window.matchMedia('(min-width: 768px)')
    function onChange(e: MediaQueryListEvent) {
      if (e.matches) setOpen(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [open])

  const { principales, resto } = dividirNav(items)
  const settingsActivo = !!settingsHref && pathname.startsWith(settingsHref)
  const masActivo = !navBloqueado && (resto.some((i) => isNavActive(pathname, i)) || settingsActivo)
  const masConAtencion = !navBloqueado && resto.some((i) => i.badge)

  return (
    <>
      <nav aria-label="Navegación principal" className="app-bottom-nav fixed inset-x-0 bottom-0 z-40 md:hidden">
        <ul className="flex">
          {principales.map((item) => {
            const contenido = (
              <>
                <span className="relative flex-none">
                  {item.icon}
                  {item.badge && !navBloqueado && <PuntoAtencion className="-right-1 -top-0.5" />}
                </span>
                <span className="w-full truncate text-center">{item.shortLabel ?? item.label}</span>
              </>
            )
            return (
              <li key={item.href} className="flex min-w-0 flex-1">
                {navBloqueado ? (
                  // En touch no hay tooltip: tocar un ítem bloqueado abre la hoja,
                  // que muestra por qué la sección todavía no está disponible.
                  <button
                    type="button"
                    onClick={() => setOpen(true)}
                    aria-disabled="true"
                    aria-haspopup="dialog"
                    aria-label={`${item.label}: ${navBloqueado}`}
                    className="app-bottom-nav__item opacity-45"
                  >
                    {contenido}
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    aria-current={isNavActive(pathname, item) ? 'page' : undefined}
                    className="app-bottom-nav__item"
                  >
                    {contenido}
                  </Link>
                )}
              </li>
            )
          })}
          <li className="flex min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={open}
              data-active={masActivo ? 'true' : undefined}
              className="app-bottom-nav__item"
            >
              <span className="relative flex-none">
                <MoreHorizontalIcon size={18} />
                {masConAtencion && <PuntoAtencion className="-right-1 -top-0.5" />}
              </span>
              <span className="w-full truncate text-center">Más</span>
            </button>
          </li>
        </ul>
      </nav>

      {open && (
        <HojaMas
          resto={resto}
          pathname={pathname}
          userEmail={userEmail}
          rolLabel={rolLabel}
          settingsHref={settingsHref}
          settingsActivo={settingsActivo}
          navBloqueado={navBloqueado}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

type HojaProps = Pick<Props, 'userEmail' | 'rolLabel' | 'settingsHref' | 'navBloqueado'> & {
  resto: NavLinkItem[]
  pathname: string
  settingsActivo: boolean
  onClose: () => void
}

/**
 * Hoja inferior ("bottom sheet") con lo que no entra en la barra. Comparte con
 * `Modal` el comportamiento de capa modal (`useDialogo`): Escape, foco atrapado,
 * scroll del fondo bloqueado y foco devuelto al botón "Más" al cerrar.
 */
function HojaMas({
  resto,
  pathname,
  userEmail,
  rolLabel,
  settingsHref,
  settingsActivo,
  navBloqueado,
  onClose,
}: HojaProps) {
  const dialogoRef = useRef<HTMLDivElement>(null)
  const tituloId = useId()
  const { isPending, handleLogout } = useCerrarSesion()

  useDialogo(true, dialogoRef, onClose)

  return (
    <div
      className="fixed inset-0 z-50 flex animate-backdrop-in items-end md:hidden"
      style={{ background: 'var(--overlay-backdrop)' }}
      onClick={onClose}
    >
      <div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        // `85dvh` y no `vh`: en el navegador del celular `vh` incluye la barra
        // de direcciones y la hoja se pasaba del borde visible.
        className="app-sheet flex max-h-[85dvh] w-full animate-sheet-in flex-col rounded-t-xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-none items-center justify-between gap-2 py-2 pl-5 pr-3">
          <h2 id={tituloId} className="app-sidebar__strong text-compact font-semibold">
            Menú
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="app-sidebar__btn app-sidebar__btn--tile flex h-11 w-11 items-center justify-center rounded-md"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
          {navBloqueado && (
            <p className="app-sidebar__muted mb-2 px-3 text-2xs leading-snug">{navBloqueado}</p>
          )}
          {resto.length > 0 && (
            <ul className="flex flex-col gap-0.5">
              {resto.map((item) => (
                <li key={item.href}>
                  {navBloqueado ? (
                    <span
                      aria-disabled="true"
                      className="app-sidebar__muted flex min-h-11 cursor-not-allowed items-center gap-3 rounded-md px-3 text-sm font-medium opacity-45"
                    >
                      <span className="flex-none">{item.icon}</span>
                      <span className="min-w-0 flex-1">{item.label}</span>
                    </span>
                  ) : (
                    <Link
                      href={item.href}
                      aria-current={isNavActive(pathname, item) ? 'page' : undefined}
                      // Tocar la ruta actual no cambia el pathname: se cierra a mano.
                      onClick={onClose}
                      className="app-sidebar__link flex min-h-11 items-center gap-3 rounded-md px-3 text-sm"
                    >
                      <span className="app-sidebar__link-icon relative flex-none">{item.icon}</span>
                      <span className="min-w-0 flex-1">{item.label}</span>
                      {item.badge && (
                        <span role="img" aria-label="Requiere atención" className="flex h-2 w-2 flex-none rounded-full bg-red-400" />
                      )}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Cuenta. El padding inferior suma la zona del indicador de inicio. */}
        <div className="flex-none space-y-1 border-t border-[color:var(--sidebar-border)] px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="px-3 pb-2">
            <p className="app-sidebar__strong text-2xs font-semibold [overflow-wrap:anywhere]">{userEmail}</p>
            <p className="app-sidebar__muted text-2xs">{rolLabel}</p>
          </div>

          {settingsHref && (
            <Link
              href={settingsHref}
              aria-current={settingsActivo ? 'page' : undefined}
              onClick={onClose}
              className="app-sidebar__link flex min-h-11 items-center gap-3 rounded-md px-3 text-sm"
            >
              <span className="app-sidebar__link-icon flex-none">
                <SettingsIcon size={18} />
              </span>
              <span className="min-w-0 flex-1">Configuración de perfil</span>
            </Link>
          )}

          <ThemeToggle className="app-sidebar__btn flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-medium disabled:opacity-50" />

          <button
            type="button"
            onClick={handleLogout}
            disabled={isPending}
            className="app-sidebar__btn app-sidebar__btn--danger flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-medium disabled:opacity-50"
          >
            <LogOutIcon size={18} />
            {isPending ? 'Cerrando sesión...' : 'Cerrar sesión'}
          </button>
        </div>
      </div>
    </div>
  )
}
