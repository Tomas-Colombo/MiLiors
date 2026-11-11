'use client'

import { useTransition, useRef, useState } from 'react'
import { Button, Input, Field, Alert, ConfirmDialog } from '@/components/ui'
import { PlusIcon } from '@/components/icons'
import {
  crearCompetencia,
  desactivarCompetencia,
  reactivarCompetencia,
  aprobarSugerencia,
  descartarSugerencia,
} from '@/modules/admin/actions'
import type { CompetenciaSugeridaAdmin } from '@/modules/admin/queries'
import { useFormAccion } from '@/components/shared/use-form-accion'

// ─── Formulario crear competencia ─────────────────────────────────────────────

export function CrearCompetenciaForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, action, pending] = useFormAccion(crearCompetencia, () => {
    formRef.current?.reset()
  })

  return (
    <div className="space-y-3">
      <form ref={formRef} action={action} className="flex items-end gap-3">
        <Field label="Nueva habilidad/tecnología" htmlFor="nombre" className="flex-1">
          <Input
            id="nombre"
            name="nombre"
            placeholder="Ej: React, Python, Excel, Inglés…"
            required
            status={!state.success && state.error ? 'error' : 'default'}
          />
        </Field>
        <Button type="submit" size="md" loading={pending} leftIcon={<PlusIcon size={15} />}>
          Agregar
        </Button>
      </form>

      {state.success && <Alert tone="success" title="Habilidad/tecnología creada correctamente." />}
      {!state.success && state.error && <Alert tone="error" title={state.error} />}
    </div>
  )
}

// ─── Botones de acción por fila ───────────────────────────────────────────────

export function CompetenciaAcciones({ id, activa }: { id: string; activa: boolean }) {
  const [isPending, startTransition] = useTransition()
  const [confirmando, setConfirmando] = useState(false)

  function handleReactivar() {
    startTransition(async () => {
      await reactivarCompetencia(id)
    })
  }

  if (!activa) {
    return (
      <Button variant="tonal" size="sm" onClick={handleReactivar} loading={isPending}>
        Reactivar
      </Button>
    )
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setConfirmando(true)}
        loading={isPending}
      >
        Desactivar
      </Button>

      <ConfirmDialog
        open={confirmando}
        onClose={() => setConfirmando(false)}
        onConfirm={() =>
          startTransition(async () => {
            await desactivarCompetencia(id)
            setConfirmando(false)
          })
        }
        tone="destructive"
        title="¿Desactivar esta habilidad/tecnología?"
        confirmLabel="Desactivar"
        loading={isPending}
      >
        Es una baja lógica: no se borra nada y podés reactivarla cuando quieras. Deja de
        ofrecerse en los formularios, y los perfiles que ya la tienen cargada la conservan.
      </ConfirmDialog>
    </>
  )
}

// ─── Acciones de moderación de sugerencias (H-205) ────────────────────────────

export function SugerenciaAcciones({
  sugerencia,
}: {
  sugerencia: CompetenciaSugeridaAdmin
}) {
  const [isPending, startTransition] = useTransition()
  const [confirmandoAprobar, setConfirmandoAprobar] = useState(false)
  const [confirmandoDescartar, setConfirmandoDescartar] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const esReactivacion = Boolean(sugerencia.coincidenciaCatalogo?.desactivada)

  function handleAprobar() {
    setErrorMsg(null)
    startTransition(async () => {
      const res = await aprobarSugerencia(sugerencia.nombreNormalizado)
      if (!res.success) {
        setErrorMsg(res.error ?? 'No se pudo aprobar la sugerencia.')
      } else {
        setConfirmandoAprobar(false)
      }
    })
  }

  function handleDescartar() {
    setErrorMsg(null)
    startTransition(async () => {
      const res = await descartarSugerencia(sugerencia.nombreNormalizado)
      if (!res.success) {
        setErrorMsg(res.error ?? 'No se pudo descartar la sugerencia.')
      } else {
        setConfirmandoDescartar(false)
      }
    })
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {errorMsg && (
        <span className="text-2xs text-error mr-2">{errorMsg}</span>
      )}
      <Button
        variant={esReactivacion ? 'tonal' : 'secondary'}
        size="sm"
        onClick={() => setConfirmandoAprobar(true)}
        loading={isPending}
      >
        {esReactivacion ? 'Aprobar (reactivar)' : 'Aprobar'}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="text-neutral-500 hover:text-error"
        onClick={() => setConfirmandoDescartar(true)}
        loading={isPending}
      >
        Descartar
      </Button>

      <ConfirmDialog
        open={confirmandoAprobar}
        onClose={() => setConfirmandoAprobar(false)}
        onConfirm={handleAprobar}
        tone="primary"
        title={esReactivacion ? '¿Aprobar y reactivar habilidad/tecnología?' : '¿Aprobar habilidad/tecnología?'}
        confirmLabel={esReactivacion ? 'Aprobar y reactivar' : 'Aprobar'}
        loading={isPending}
      >
        {esReactivacion
          ? `Al aprobar, se reactivará la competencia existente "${sugerencia.coincidenciaCatalogo?.nombre}" en el catálogo oficial y se le asignará a los ${sugerencia.cantidadPostulantes} postulante(s) que la sugirieron.`
          : `Al aprobar, se agregará "${sugerencia.nombre}" al catálogo oficial y se le asignará a los ${sugerencia.cantidadPostulantes} postulante(s) que la sugirieron.`}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmandoDescartar}
        onClose={() => setConfirmandoDescartar(false)}
        onConfirm={handleDescartar}
        tone="destructive"
        title="¿Descartar esta sugerencia?"
        confirmLabel="Descartar"
        loading={isPending}
      >
        Se eliminarán las sugerencias pendientes para &quot;{sugerencia.nombre}&quot; de los {sugerencia.cantidadPostulantes} postulante(s). Esta acción no se puede deshacer.
      </ConfirmDialog>
    </div>
  )
}
