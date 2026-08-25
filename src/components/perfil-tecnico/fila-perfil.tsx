import type { ReactNode } from 'react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

export interface FilaPerfilProps {
  titulo: string
  /** Segunda línea: institución, empresa, nivel. */
  subtitulo?: ReactNode
  /** Tercera línea, más apagada: fechas, duración. */
  meta?: ReactNode
  /** Contenido libre bajo la meta: la descripción de una experiencia, el enlace
   *  a la credencial de un curso. */
  children?: ReactNode
  /** Sin handler no se ofrece editar (los idiomas se borran y se vuelven a cargar). */
  onEditar?: () => void
  onEliminar: () => void
  /** Las filas de una sola línea se ven mejor centradas. */
  align?: 'start' | 'center'
}

/**
 * Fila de un ítem cargado en el perfil técnico: formación, curso, experiencia o
 * idioma. Las cuatro secciones repetían este marcado con diferencias de un píxel.
 */
export function FilaPerfil({
  titulo,
  subtitulo,
  meta,
  children,
  onEditar,
  onEliminar,
  align = 'start',
}: FilaPerfilProps) {
  return (
    <div
      className={cn(
        'flex justify-between gap-2 rounded-xl border border-neutral-200 bg-surface p-4',
        align === 'center' ? 'items-center' : 'items-start',
      )}
    >
      <div>
        <p className="text-[14px] font-semibold text-ink">{titulo}</p>
        {subtitulo && <p className="text-[13px] text-muted">{subtitulo}</p>}
        {meta && <p className="text-[12px] text-neutral-400">{meta}</p>}
        {children}
      </div>

      <div className="flex flex-none gap-2">
        {onEditar && (
          <Button type="button" size="sm" variant="ghost" onClick={onEditar}>
            Editar
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-error hover:bg-[#fceeed]"
          onClick={onEliminar}
        >
          Eliminar
        </Button>
      </div>
    </div>
  )
}
