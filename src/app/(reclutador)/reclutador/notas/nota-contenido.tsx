'use client'

import { useState, useRef, useLayoutEffect } from 'react'

/**
 * Muestra el contenido de una nota. Si el texto es largo (varios párrafos o
 * líneas) lo recorta a las primeras líneas con un botón "Ver más" para
 * expandirlo; si es corto se muestra completo como siempre.
 */
export function NotaContenido({ contenido }: { contenido: string }) {
  const [expanded, setExpanded] = useState(false)
  const [truncable, setTruncable] = useState(false)
  const ref = useRef<HTMLParagraphElement>(null)

  // Medimos (en estado colapsado) si el texto excede las líneas visibles.
  // Sólo entonces tiene sentido mostrar el botón de "Ver más".
  useLayoutEffect(() => {
    const el = ref.current
    if (el && !expanded) {
      setTruncable(el.scrollHeight > el.clientHeight + 1)
    }
  }, [contenido, expanded])

  return (
    <div className="space-y-1.5">
      <p
        ref={ref}
        className={`text-sm text-ink leading-relaxed whitespace-pre-line ${
          expanded ? '' : 'line-clamp-4'
        }`}
      >
        {contenido}
      </p>
      {(truncable || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[12.5px] font-semibold text-primary-600 hover:underline"
        >
          {expanded ? 'Ver menos' : 'Ver más'}
        </button>
      )}
    </div>
  )
}
