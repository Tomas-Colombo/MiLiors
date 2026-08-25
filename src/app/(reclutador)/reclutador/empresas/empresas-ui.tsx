'use client'

import Link from 'next/link'
import { useActionState, useState, useTransition } from 'react'
import { Button, Field, Input, Textarea, Alert, Modal } from '@/components/ui'
import { PlusIcon, AlertTriangleIcon } from '@/components/icons'
import { crearEmpresa, actualizarEmpresa, darDeBajaEmpresa } from '@/modules/empresas/actions'
import type { ActionResult } from '@/lib/types/domain'
import type { EmpresaDelReclutador } from '@/modules/empresas/queries'

const initialState: ActionResult = { success: false, error: '' }

type CamposProps = {
  fieldErrors: Record<string, string[]>
  empresa?: EmpresaDelReclutador
}

/** Los tres campos de la empresa, compartidos por el alta y la edición. */
function CamposEmpresa({ fieldErrors, empresa }: CamposProps) {
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

// ─── Alta ─────────────────────────────────────────────────────────────────────

export function NuevaEmpresaBtn() {
  const [abierto, setAbierto] = useState(false)
  const [state, action, pending] = useActionState(crearEmpresa, initialState)
  const fieldErrors = !state.success && state.fieldErrors ? state.fieldErrors : {}

  // El alta exitosa cierra el modal; la lista se refresca por revalidatePath.
  // Se sincroniza en render (no en efecto) para no encadenar un re-render extra.
  const [ultimoState, setUltimoState] = useState(state)
  if (state !== ultimoState) {
    setUltimoState(state)
    if (state.success) setAbierto(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-600 px-[18px] text-sm font-semibold text-white hover:brightness-105"
      >
        <PlusIcon size={16} />
        Nueva empresa
      </button>

      <Modal
        open={abierto}
        onClose={() => !pending && setAbierto(false)}
        title="Nueva empresa"
        width={520}
      >
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
              onClick={() => setAbierto(false)}
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
    </>
  )
}

// ─── Acciones por fila ────────────────────────────────────────────────────────

export function EmpresaAcciones({ empresa }: { empresa: EmpresaDelReclutador }) {
  const [modo, setModo] = useState<'editar' | 'baja' | null>(null)
  const [isPending, startTransition] = useTransition()
  const [errorBaja, setErrorBaja] = useState<string | null>(null)

  const boundActualizar = actualizarEmpresa.bind(null, empresa.id)
  const [state, action, pending] = useActionState(boundActualizar, initialState)
  const fieldErrors = !state.success && state.fieldErrors ? state.fieldErrors : {}

  // Guardar con éxito cierra el modal de edición (ver nota en NuevaEmpresaBtn).
  const [ultimoState, setUltimoState] = useState(state)
  if (state !== ultimoState) {
    setUltimoState(state)
    if (state.success) setModo(null)
  }

  function handleBaja() {
    setErrorBaja(null)
    startTransition(async () => {
      const res = await darDeBajaEmpresa(empresa.id)
      if (!res.success) setErrorBaja(res.error)
      else setModo(null)
    })
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      <Link
        href={`/reclutador/postulaciones?empresa=${empresa.id}`}
        className="inline-flex h-7 items-center rounded-[6px] border border-neutral-300 bg-surface px-2.5 text-[11.5px] font-semibold text-ink-soft hover:bg-neutral-50 whitespace-nowrap"
      >
        Ver postulaciones
      </Link>
      <button
        type="button"
        onClick={() => setModo('editar')}
        className="inline-flex h-7 items-center rounded-[6px] border border-neutral-300 bg-surface px-2.5 text-[11.5px] font-semibold text-ink-soft hover:bg-neutral-50"
      >
        Editar
      </button>
      {empresa.activa && (
        <button
          type="button"
          onClick={() => {
            setErrorBaja(null)
            setModo('baja')
          }}
          className="inline-flex h-7 items-center rounded-[6px] bg-error-solid px-2.5 text-[11.5px] font-semibold text-white hover:bg-error-strong"
        >
          Dar de baja
        </button>
      )}

      <Modal
        open={modo === 'editar'}
        onClose={() => !pending && setModo(null)}
        title="Editar empresa"
        width={520}
      >
        <form action={action} className="space-y-4">
          {!state.success && state.error && !state.fieldErrors && (
            <Alert tone="error" title={state.error} />
          )}
          <CamposEmpresa fieldErrors={fieldErrors} empresa={empresa} />
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setModo(null)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" loading={pending}>
              Guardar cambios
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={modo === 'baja'}
        onClose={() => !isPending && setModo(null)}
        icon={
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-error-bg text-error">
            <AlertTriangleIcon size={22} strokeWidth={2} />
          </span>
        }
        title={`¿Dar de baja ${empresa.nombre_empresa}?`}
        footer={
          <>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setModo(null)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleBaja} loading={isPending}>
              Dar de baja
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-left">
          <p>
            Si das de baja la empresa se pausarán todos sus puestos activos
            {empresa.puestos_activos > 0 && (
              <> (<strong>{empresa.puestos_activos}</strong>)</>
            )}
            {' '}y las postulaciones en curso
            {empresa.postulaciones_activas > 0 && (
              <> (<strong>{empresa.postulaciones_activas}</strong>)</>
            )}
            {' '}pasarán a estado cerrada. No vas a poder publicar puestos nuevos para esta empresa.
          </p>
          <p>¿Estás seguro?</p>
          {errorBaja && <Alert tone="error" title={errorBaja} />}
        </div>
      </Modal>
    </div>
  )
}
