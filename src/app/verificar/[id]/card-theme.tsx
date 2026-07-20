'use client'

const THEME_STORAGE_KEY = 'talentid-theme'

// Mismo storage y clase `.dark` en <html> que el resto de TalentID (ver
// theme-toggle.tsx): sin useState, para que el tema elegido persista entre
// sesiones y sea consistente con el panel autenticado y con /login.
function toggleTheme() {
  const next = !document.documentElement.classList.contains('dark')
  document.documentElement.classList.toggle('dark', next)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light')
  } catch {
    // localStorage puede no estar disponible (modo privado).
  }
}

export function CardTheme({ children }: { children: React.ReactNode }) {
  return (
    <>
      <button type="button" className="vf-theme-toggle" onClick={toggleTheme}>
        <span className="vf-theme-toggle-dot" />
        <span className="dark:hidden">Oscuro</span>
        <span className="hidden dark:inline">Claro</span>
      </button>

      <div className="vf-card-wrap">{children}</div>
    </>
  )
}
