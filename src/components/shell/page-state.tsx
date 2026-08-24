/**
 * Estado de página · MiLiors
 *
 * El bloque que pintan los `error.tsx` y `not-found.tsx` de cada segmento:
 * ícono, código, título, bajada y acciones. Misma gramática visual que el
 * `EmptyState` del kit (caja de ícono redondeada, título en negrita, bajada
 * apagada), en tamaño de página entera.
 *
 * `screen` lo centra en el viewport: lo usan los archivos de la raíz de `app/`,
 * que se renderizan sin barra lateral. Los de los grupos autenticados no lo
 * llevan, porque caen dentro del layout con sidebar y usan el mismo contenedor
 * que el resto de las páginas de ese grupo.
 */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'error' | 'neutral'

const tonos: Record<Tone, string> = {
  neutral: 'bg-primary-ghost-hover text-primary-500',
  error: 'bg-error-bg text-error',
}

export interface PageStateProps {
  tone?: Tone
  icon: ReactNode
  /** Eyebrow en monoespaciada: "404", "Error 500". */
  code?: string
  title: ReactNode
  description?: ReactNode
  /** Botones/enlaces. Se centran en fila. */
  actions?: ReactNode
  /** Dato técnico al pie (el digest del error) en monoespaciada. */
  detail?: ReactNode
  /** Centra el bloque en el viewport, para las pantallas sin sidebar. */
  screen?: boolean
  className?: string
}

export function PageState({
  tone = 'neutral',
  icon,
  code,
  title,
  description,
  actions,
  detail,
  screen = false,
  className,
}: PageStateProps) {
  const bloque = (
    <div className={cn('mx-auto max-w-md text-center', !screen && 'px-6 py-16', className)}>
      <div
        className={cn(
          'mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-[14px]',
          tonos[tone],
        )}
      >
        {icon}
      </div>

      {code && (
        <div className="mb-2 font-mono text-[12px] font-medium uppercase tracking-[0.18em] text-neutral-400">
          {code}
        </div>
      )}

      <h1 className="text-2xl font-extrabold text-ink">{title}</h1>

      {description && (
        <p className="mx-auto mt-2 max-w-sm text-sm leading-[1.6] text-muted">{description}</p>
      )}

      {actions && <div className="mt-7 flex flex-wrap items-center justify-center gap-3">{actions}</div>}

      {detail && (
        <p className="mt-8 font-mono text-[11.5px] break-all text-neutral-400">{detail}</p>
      )}
    </div>
  )

  if (!screen) return bloque

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-page px-6 py-16">
      {bloque}
    </div>
  )
}
