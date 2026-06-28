'use client'

import { ChevronLeftIcon } from '@/components/icons'

export function BackButton() {
  function handleBack() {
    if (window.history.length > 1) {
      window.history.back()
    } else {
      window.location.href = '/'
    }
  }

  return (
    <button
      onClick={handleBack}
      className="flex items-center gap-1 text-sm font-medium text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
    >
      <ChevronLeftIcon size={15} />
      Volver
    </button>
  )
}
