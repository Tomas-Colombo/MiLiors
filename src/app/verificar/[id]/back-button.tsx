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
    <button onClick={handleBack} className="vf-back">
      <ChevronLeftIcon size={15} />
      Volver
    </button>
  )
}
