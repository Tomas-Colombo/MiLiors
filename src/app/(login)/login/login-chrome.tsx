'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { LoginForm } from './login-form'
import { VerifyPanel } from './verify-panel'

const HASH = '9a4f0c2e7d1b8836f5e2a0c9d4b71f6e3a8c5d0b2f9e7a1c'
const THEME_STORAGE_KEY = 'talentid-theme'

// Mismo storage y clase `.dark` en <html> que el resto de TalentID (ver
// theme-toggle.tsx): sin useState, para que el tema elegido persista entre
// sesiones y sea consistente con el panel autenticado y con /verificar.
function toggleTheme() {
  const next = !document.documentElement.classList.contains('dark')
  document.documentElement.classList.toggle('dark', next)
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next ? 'dark' : 'light')
  } catch {
    // localStorage puede no estar disponible (modo privado).
  }
}

export function LoginChrome({ aviso }: { aviso?: string }) {
  const [revealed, setRevealed] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let i = 0
    let pausing = false
    timerRef.current = setInterval(() => {
      if (pausing) return
      i++
      if (i > HASH.length) {
        pausing = true
        setTimeout(() => {
          i = 0
          pausing = false
          setRevealed('')
        }, 1600)
        return
      }
      setRevealed(HASH.slice(0, i))
    }, 55)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  return (
    <div className="tid-login">
      <button type="button" className="tid-theme-toggle" onClick={toggleTheme}>
        <span className="tid-theme-toggle-dot" />
        <span className="dark:hidden">Oscuro</span>
        <span className="hidden dark:inline">Claro</span>
      </button>

      {/* Columna izquierda · formulario */}
      <div className="tid-form">
        <div>
          <div className="tid-logo">
            <span>Talent</span>
            <span className="tid-logo-accent">ID</span>
          </div>
          <div className="tid-logo-tagline">Plataforma de talento verificado</div>
        </div>

        <div className="tid-form-body">
          <h1 className="tid-h1">
            Entrá a tu <em>identidad</em> comprobable.
          </h1>
          <p className="tid-subhead">
            Un solo acceso a tu perfil técnico, tu personalidad y tus certificados verificables.
          </p>

          <div role="tablist" className="tid-tabs">
            <Link href="/login" role="tab" aria-selected="true" data-active="true" className="tid-tab">
              Ingresar
            </Link>
            <Link href="/registro" role="tab" aria-selected="false" data-active="false" className="tid-tab">
              Crear cuenta
            </Link>
          </div>

          {aviso && <div className="tid-alert tid-alert-info">{aviso}</div>}

          <LoginForm />

          <div className="tid-switch">
            ¿No tenés cuenta? <Link href="/registro">Creá una verificada</Link>
          </div>
        </div>

        <div className="tid-copyright">© 2026 TalentID · Firma criptográfica de cada certificado</div>
      </div>

      {/* Columna derecha · relato del certificado */}
      <div className="tid-doc">
        <div className="tid-doc-texture" />
        <div className="tid-watermark">VERIFICADO</div>

        <div className="tid-doc-header">
          <span className="tid-doc-kicker">Verificación criptográfica · TalentID</span>
        </div>

        <div className="tid-doc-hero">
          <h2 className="tid-doc-h2">
            La confianza no se declara. Se <em>comprueba</em>.
          </h2>
          <p className="tid-doc-p">
            Cada certificado emitido en TalentID lleva una firma única. Cualquiera puede verificar
            que es real —sin llamadas, sin PDFs falsificables, sin dudas.
          </p>
        </div>

        <div className="tid-cert-card">
          <div className="tid-cert-label">Hash SHA-256 del certificado</div>
          <div className="tid-hash-value">
            {revealed}
            <span className="tid-hash-cursor" />
          </div>

          <div className="tid-cert-grid">
            <div>
              <div className="tid-cert-item-label">Emitido</div>
              <div className="tid-cert-item-value">01 · 01 · 2026</div>
            </div>
            <div>
              <div className="tid-cert-item-label">Titular</div>
              <div className="tid-cert-item-value">J. Pérez</div>
            </div>
            <div>
              <div className="tid-cert-item-label">Estado</div>
              <div className="tid-cert-item-value tid-verified-state">● Vigente</div>
            </div>
          </div>

          <div className="tid-cert-divider" />

          <VerifyPanel />
        </div>
      </div>
    </div>
  )
}
