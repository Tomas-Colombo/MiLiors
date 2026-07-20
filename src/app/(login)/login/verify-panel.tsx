'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function VerifyPanel() {
  const router = useRouter()
  const [id, setId] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  function handleVerificar() {
    const trimmed = id.trim()
    if (!trimmed) {
      setError('Ingresá el ID del certificado.')
      return
    }
    if (!UUID_RE.test(trimmed)) {
      setError('El ID debe tener el formato correcto (ej: ef24e3b5-040d-43c9-99c8-57f2cb0649de).')
      return
    }
    setError('')
    setChecking(true)
    router.push(`/verificar/${trimmed}`)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleVerificar()
  }

  return (
    <div>
      <div className="tid-cert-label">Comprobá un certificado ahora</div>
      <div className="tid-verify-row">
        <input
          className="tid-verify-input"
          placeholder="Pegá el ID de verificación…"
          value={id}
          onChange={(e) => {
            setId(e.target.value)
            setError('')
          }}
          onKeyDown={handleKeyDown}
          data-error={error ? 'true' : undefined}
        />
        <button type="button" className="tid-verify-btn" onClick={handleVerificar} disabled={checking}>
          {checking ? 'Abriendo…' : 'Verificar'}
        </button>
      </div>
      {error && <div className="tid-verify-error">{error}</div>}
    </div>
  )
}
