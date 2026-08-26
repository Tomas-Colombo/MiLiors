'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { Modal } from '@/components/ui'

/**
 * Contenido de una nota acotado a pocas líneas, para que las tarjetas y los
 * perfiles no crezcan con notas largas. Si el texto no entra completo aparece
 * "Ver", que lo abre entero en un modal.
 */
export function NotaTexto({
  contenido,
  className = 'text-[13px] text-ink leading-relaxed',
  titulo = 'Nota',
  lineas = 3,
}: {
  contenido: string
  className?: string
  titulo?: string
  lineas?: 2 | 3 | 4
}) {
  const [abierto, setAbierto] = useState(false)
  const [recortado, setRecortado] = useState(false)
  const ref = useRef<HTMLParagraphElement>(null)

  // Sólo ofrecemos "Ver" si el texto realmente se corta.
  useLayoutEffect(() => {
    const el = ref.current
    if (el) setRecortado(el.scrollHeight > el.clientHeight + 1)
  }, [contenido])

  const clamp = { 2: 'line-clamp-2', 3: 'line-clamp-3', 4: 'line-clamp-4' }[lineas]

  return (
    <div className="space-y-1.5">
      <p ref={ref} className={`${clamp} whitespace-pre-wrap ${className}`}>
        {contenido}
      </p>
      {recortado && (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="text-[12.5px] font-semibold text-primary-600 hover:underline"
        >
          Ver
        </button>
      )}

      <Modal open={abierto} onClose={() => setAbierto(false)} title={titulo} width={560}>
        <p className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed text-ink">
          {contenido}
        </p>
      </Modal>
    </div>
  )
}
