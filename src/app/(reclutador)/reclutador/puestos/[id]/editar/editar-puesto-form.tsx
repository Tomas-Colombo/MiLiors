'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Field, Input, Textarea, Select, Button, Alert } from '@/components/ui'
import { editarPuesto } from '@/modules/puestos/actions'
import { CARGA_HORARIA_LABEL, UBICACION_LABEL } from '@/lib/constants/enums'
import type { ActionResult } from '@/lib/types/domain'
import type { PuestoItem } from '@/modules/puestos/queries'
import type { FormularioPreselector } from '@/modules/preselector/queries'
import { FormularioPreselectorEditor } from '../../formulario-preselector-editor'

type Props = {
  puestoId: string
  puesto: PuestoItem & { perfil_psicologico_deseado: string | null }
  sectores: { id: string; nombre_sector: string }[]
  formularioPreselector: FormularioPreselector | null
  /** true cuando el formulario ya tiene respuestas de postulantes y no se puede modificar. */
  formularioBloqueado?: boolean
}

const initialState: ActionResult = { success: false, error: '' }

export function EditarPuestoForm({ puestoId, puesto, sectores, formularioPreselector, formularioBloqueado }: Props) {
  // editarPuesto signature is (puestoId, prevState, formData) — bind the id
  const boundAction = editarPuesto.bind(null, puestoId)
  const [state, action, isPending] = useActionState(boundAction, initialState)

  const fieldErrors = !state.success && state.fieldErrors ? state.fieldErrors : {}

  const sectorOptions = [
    { value: '', label: 'Sin sector' },
    ...sectores.map((s) => ({ value: s.id, label: s.nombre_sector })),
  ]

  const cargaOptions = Object.entries(CARGA_HORARIA_LABEL).map(([v, l]) => ({ value: v, label: l }))
  const ubicacionOptions = Object.entries(UBICACION_LABEL).map(([v, l]) => ({ value: v, label: l }))

  return (
    <form action={action} className="space-y-5">
      {!state.success && state.error && <Alert tone="error" title={state.error} />}
      {state.success && <Alert tone="success" title="Puesto actualizado correctamente." />}

      <Field
        label="Título del puesto"
        htmlFor="titulo_puesto"
        required
        error={fieldErrors.titulo_puesto?.[0]}
      >
        <Input
          id="titulo_puesto"
          name="titulo_puesto"
          defaultValue={puesto.titulo_puesto}
          placeholder="Ej: Desarrollador Frontend Senior"
          status={fieldErrors.titulo_puesto ? 'error' : 'default'}
        />
      </Field>

      <Field
        label="Descripción"
        htmlFor="descripcion_texto"
        error={fieldErrors.descripcion_texto?.[0]}
        hint="Máximo 3000 caracteres. Describí las responsabilidades y requisitos."
      >
        <Textarea
          id="descripcion_texto"
          name="descripcion_texto"
          defaultValue={puesto.descripcion_texto ?? ''}
          placeholder="Describí el puesto, responsabilidades y perfil buscado…"
          rows={5}
          status={fieldErrors.descripcion_texto ? 'error' : 'default'}
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Sector" htmlFor="sector_id" error={fieldErrors.sector_id?.[0]}>
          <Select
            id="sector_id"
            name="sector_id"
            options={sectorOptions}
            defaultValue={puesto.sector_id ?? ''}
          />
        </Field>

        <Field
          label="Idioma requerido"
          htmlFor="idioma"
          required
          error={fieldErrors.idioma?.[0]}
        >
          <Input
            id="idioma"
            name="idioma"
            defaultValue={puesto.idioma}
            placeholder="Ej: Español, Inglés"
            status={fieldErrors.idioma ? 'error' : 'default'}
          />
        </Field>

        <Field
          label="Carga horaria"
          htmlFor="carga_horaria"
          required
          error={fieldErrors.carga_horaria?.[0]}
        >
          <Select
            id="carga_horaria"
            name="carga_horaria"
            options={cargaOptions}
            defaultValue={puesto.carga_horaria}
          />
        </Field>

        <Field
          label="Modalidad"
          htmlFor="ubicacion"
          required
          error={fieldErrors.ubicacion?.[0]}
        >
          <Select
            id="ubicacion"
            name="ubicacion"
            options={ubicacionOptions}
            defaultValue={puesto.ubicacion}
          />
        </Field>

        <Field
          label="Nivel de experiencia"
          htmlFor="nivel_experiencia"
          error={fieldErrors.nivel_experiencia?.[0]}
        >
          <Input
            id="nivel_experiencia"
            name="nivel_experiencia"
            defaultValue={puesto.nivel_experiencia ?? ''}
            placeholder="Ej: 3+ años, Junior, Senior"
            status={fieldErrors.nivel_experiencia ? 'error' : 'default'}
          />
        </Field>
      </div>

      <Field
        label="Perfil psicológico deseado"
        htmlFor="perfil_psicologico_deseado"
        error={fieldErrors.perfil_psicologico_deseado?.[0]}
        hint="Solo visible para vos. Los postulantes nunca verán este campo."
      >
        <Textarea
          id="perfil_psicologico_deseado"
          name="perfil_psicologico_deseado"
          defaultValue={puesto.perfil_psicologico_deseado ?? ''}
          placeholder="Describí el perfil actitudinal o psicológico que buscás…"
          rows={3}
          status={fieldErrors.perfil_psicologico_deseado ? 'error' : 'default'}
        />
      </Field>

      <div className="border-t border-neutral-100 pt-5">
        <FormularioPreselectorEditor
          initialFormulario={formularioPreselector}
          fieldErrors={fieldErrors}
          readOnly={formularioBloqueado}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Link
          href={`/reclutador/puestos/${puestoId}`}
          className="inline-flex h-10 items-center rounded-md border border-neutral-300 bg-surface px-[18px] text-sm font-semibold text-ink-soft hover:bg-neutral-50"
        >
          Cancelar
        </Link>
        <Button type="submit" loading={isPending}>
          Guardar cambios
        </Button>
      </div>
    </form>
  )
}
