'use client'

import { useActionState, useEffect, useRef } from 'react'
import { Alert, Button, Field, Input, Modal, Textarea } from '@/components/ui'
import { crearEmpresa } from '@/modules/empresas/actions'
import type { ActionResult } from '@/lib/types/domain'
import type { EmpresaOption } from '@/modules/empresas/queries'

/** Lo que precarga los campos en modo edición. */
export type EmpresaCampos = {
  nombre_empresa: string
  descripcion: string | null
  link_url: string | null
}

type CamposProps = {
  fieldErrors: Record<string, string[]>
  empresa?: EmpresaCampos
}

/** Los tres campos de la empresa, compartidos por el alta y la edición. */
export function CamposEmpresa({ fieldErrors, empresa }: CamposProps) {
  return (
    <div className="space-y-4 text-left">
      <Field
        label="Nombre de la empresa"
        htmlFor="nombre_empresa"
        required
        error={fieldErrors.nombre_empresa?.[0]}
      >
        <Input
          id="nombre_empresa"
          name="nombre_empresa"
          placeholder="Ej: Acme Corp"
          defaultValue={empresa?.nombre_empresa ?? ''}
          status={fieldErrors.nombre_empresa ? 'error' : 'default'}
        />
      </Field>

      <Field
        label="Descripción"
        htmlFor="descripcion"
        hint="Breve descripción de la empresa (opcional)."
        error={fieldErrors.descripcion?.[0]}
      >
        <Textarea
          id="descripcion"
          name="descripcion"
          placeholder="A qué se dedica la empresa…"
          rows={3}
          defaultValue={empresa?.descripcion ?? ''}
          status={fieldErrors.descripcion ? 'error' : 'default'}
        />
      </Field>

      <Field label="Sitio web" htmlFor="link_url" error={fieldErrors.link_url?.[0]}>
        <Input
          id="link_url"
          name="link_url"
          type="url"
          placeholder="https://ejemplo.com"
          defaultValue={empresa?.link_url ?? ''}
          status={fieldErrors.link_url ? 'error' : 'default'}
        />
      </Field>
    </div>
  )
}

const initialState: ActionResult<EmpresaOption> = { success: false, error: '' }

type Props = {
  open: boolean
  onClose: () => void
  /** Recibe la empresa recién creada, para poder usarla sin recargar la página. */
  onCreada?: (empresa: EmpresaOption) => void
}

/**
 * Alta de empresa en un modal. El estado de apertura vive afuera para poder
 * abrirlo desde cualquier pantalla (la lista de empresas, el alta de puesto).
 *
 * Ojo al ubicarlo: trae su propio <form>, así que va como hermano —nunca
 * dentro— del formulario de la pantalla que lo abre.
 */
export function NuevaEmpresaModal({ open, onClose, onCreada }: Props) {
  const [state, action, pending] = useActionState(crearEmpresa, initialState)
  const fieldErrors = !state.success && state.fieldErrors ? state.fieldErrors : {}

  // Los callbacks van por ref para que el efecto dependa sólo del estado de la
  // action y no se vuelva a disparar por un arrow inline del padre.
  const callbacks = useRef({ onClose, onCreada })
  useEffect(() => {
    callbacks.current = { onClose, onCreada }
  })

  // El alta exitosa cierra el modal y avisa a quien lo abrió. En efecto y no en
  // render: `onClose`/`onCreada` tocan estado del padre, y React no permite
  // actualizarlo mientras se renderiza este componente.
  const visto = useRef(state)
  useEffect(() => {
    if (state === visto.current) return
    visto.current = state
    if (!state.success) return
    callbacks.current.onCreada?.(state.data)
    callbacks.current.onClose()
  }, [state])

  return (
    <Modal open={open} onClose={() => !pending && onClose()} title="Nueva empresa" width={520}>
      <form action={action} className="space-y-4">
        {!state.success && state.error && !state.fieldErrors && (
          <Alert tone="error" title={state.error} />
        )}
        <CamposEmpresa fieldErrors={fieldErrors} />
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClose}
            disabled={pending}
          >
            Cancelar
          </Button>
          <Button type="submit" className="flex-1" loading={pending}>
            Crear empresa
          </Button>
        </div>
      </form>
    </Modal>
  )
}
