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
    <button
      onClick={handleCopy}
      title="Copiar ID"
      className="group flex w-full items-center gap-2 rounded-lg bg-neutral-100 px-3 py-2.5 text-left transition-colors hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
    >
      {/* lock icon */}
      <svg
        width="12"
        height="13"
        viewBox="0 0 12 13"
        fill="none"
        className="flex-none text-faint"
        aria-hidden
      >
        <rect x="1.5" y="5.5" width="9" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
        <path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      </svg>

      <span className="flex-1 truncate font-mono text-[10px] leading-none text-ink">
        {id}
      </span>

      <span className={`flex-none text-[10px] font-semibold transition-colors ${copied ? 'text-success' : 'text-faint group-hover:text-muted'}`}>
        {copied ? 'Copiado' : 'Copiar'}
      </span>
    </button>
  )
}
