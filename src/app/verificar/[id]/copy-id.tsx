'use client'

import { useState } from 'react'

export function CopyId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // silently fail — clipboard blocked
    }
  }

  return (
    <button onClick={handleCopy} title="Copiar ID" className="vf-copy">
      {/* lock icon */}
      <svg width="12" height="13" viewBox="0 0 12 13" fill="none" className="flex-none" aria-hidden>
        <rect x="1.5" y="5.5" width="9" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
        <path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      </svg>

      <span className="vf-copy-value">{id}</span>

      <span className="vf-copy-action" data-copied={copied ? 'true' : undefined}>
        {copied ? 'Copiado' : 'Copiar'}
      </span>
    </button>
  )
}
