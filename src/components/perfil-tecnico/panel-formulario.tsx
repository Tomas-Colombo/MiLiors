import type { ReactNode } from 'react'
import { Alert, Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { errorGeneral } from './form-estado'
import type { ActionResult } from '@/lib/types/domain'

/**
 * El marco de los formularios del perfil técnico: el `<form>`, el error general
 * y la botonera. Los campos van como `children`.
 *
 * Son dos paneles y no uno con banderas porque se distinguen a propósito: el
 * alta es gris y discreta, la edición se pinta en tono de marca para que se vea
 * qué fila se está tocando.
 */

type PanelBaseProps = {
  action: (formData: FormData) => void
  state: ActionResult
  className: string
  children: ReactNode
  footer: ReactNode
}

function PanelBase({ action, state, className, children, footer }: PanelBaseProps) {
  const error = errorGeneral(state)
  return (
    <form action={action} className={cn('space-y-3 rounded-xl border p-4', className)}>
      {children}
      {error && <Alert tone="error">{error}</Alert>}
      {footer}
    </form>
  )
}

export interface PanelAltaProps {
  /** Encabezado del panel: "Agregar formación". */
  titulo: string
  /** Texto del botón de envío. */
  textoBoton?: string
  action: (formData: FormData) => void
  state: ActionResult
  pending: boolean
  children: ReactNode
}

export function PanelAlta({
  titulo,
  textoBoton = 'Agregar',
  action,
  state,
  pending,
  children,
}: PanelAltaProps) {
  return (
    <PanelBase
      action={action}
      state={state}
      className="mt-4 border-neutral-200 bg-neutral-50"
      footer={
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? 'Guardando…' : textoBoton}
        </Button>
      }
    >
      <p className="text-[13px] font-semibold text-ink">{titulo}</p>
      {children}
    </PanelBase>
  )
}

export interface PanelEdicionProps {
  action: (formData: FormData) => void
  state: ActionResult
  pending: boolean
  onCancel: () => void
  children: ReactNode
}

export function PanelEdicion({ action, state, pending, onCancel, children }: PanelEdicionProps) {
  return (
    <PanelBase
      action={action}
      state={state}
      className="border-primary-200 bg-primary-tint/30"
      footer={
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? 'Guardando…' : 'Guardar'}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      }
    >
      {children}
    </PanelBase>
  )
}
