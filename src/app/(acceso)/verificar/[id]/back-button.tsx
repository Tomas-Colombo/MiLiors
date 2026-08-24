'use client'

import { ChevronLeftIcon } from '@/components/icons'

export function BackButton() {
  function handleBack() {
    if (window.history.length > 1) {
      window.history.back()
    } else {
      // Sin historial (link compartido, QR): el destino natural es el
      // buscador de certificados, no la home autenticada.
      window.location.href = '/verificar'
    }
  }

  return (
    <button onClick={handleBack} className="vf-back">
      <ChevronLeftIcon size={15} />
      Volver
    </button>
  )
}
