'use client'

import { MoonIcon, SunIcon } from '@/components/icons'

const STORAGE_KEY = 'miliors-theme'

type Props = {
  /** Si es true, sólo muestra el ícono (sidebar colapsado). */
  iconOnly?: boolean
  className?: string
}

// No usa useState: SSR emite ambos íconos; CSS (dark:block/dark:hidden) muestra
// el correcto según la clase `.dark` que el script en <head> aplicó antes del paint.
export function ThemeToggle({ iconOnly = false, className }: Props) {
  function toggle() {
    const next = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light')
    } catch {
      // localStorage puede no estar disponible (modo privado).
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Cambiar tema claro/oscuro"
      title="Cambiar tema"
      className={
        className ??
        'flex items-center gap-2 text-xs font-medium transition-colors disabled:opacity-50'
      }
      style={{ color: 'var(--sidebar-item-text)' }}
      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--sidebar-item-text-active)' }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--sidebar-item-text)' }}
    >
      {/* El CSS se encarga de mostrar el ícono correcto — sin estado de React */}
      <SunIcon  size={14} className="hidden dark:block" />
      <MoonIcon size={14} className="dark:hidden" />
      {!iconOnly && (
        <>
          <span className="dark:hidden">Modo oscuro</span>
          <span className="hidden dark:block">Modo claro</span>
        </>
      )}
    </button>
  )
}
