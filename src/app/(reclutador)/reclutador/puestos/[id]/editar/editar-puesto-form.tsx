'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { Field, Input, Textarea, FancySelect, SearchableSelect, Button, Alert } from '@/components/ui'
import {
  UbicacionSelector,
  type ProvinciaOption,
  type UbicacionInicial,
} from '@/components/shared/ubicacion-selector'
import { CarrerasMultiSelect } from '@/components/shared/carreras-multi-select'
import { editarPuesto } from '@/modules/puestos/actions'
import { CARGA_HORARIA_LABEL, UBICACION_LABEL, UBICACION, IDIOMAS_COMUNES } from '@/lib/constants/enums'
import type { ActionResult } from '@/lib/types/domain'
import type { PuestoItem } from '@/modules/puestos/queries'
import type { FormularioPreselector } from '@/modules/preselector/queries'
import type { CarreraOption } from '@/modules/carreras/queries'
import type { EmpresaOption } from '@/modules/empresas/queries'
import { FormularioPreselectorEditor } from '../../formulario-preselector-editor'

type Props = {
  puestoId: string
  puesto: PuestoItem & { perfil_psicologico_deseado: string | null }
  /** Empresas del reclutador; incluye la del puesto aunque esté dada de baja. */
  empresas: EmpresaOption[]
  sectores: { id: string; nombre_sector: string }[]
  carreras: CarreraOption[]
  formularioPreselector: FormularioPreselector | null
  /** true cuando el formulario ya tiene respuestas de postulantes y no se puede modificar. */
  formularioBloqueado?: boolean
  provincias: ProvinciaOption[]
  ubicacionInicial: UbicacionInicial | null
}

const initialState: ActionResult = { success: false, error: '' }

export function EditarPuestoForm({ puestoId, puesto, empresas, sectores, carreras, formularioPreselector, formularioBloqueado, provincias, ubicacionInicial }: Props) {
  // editarPuesto signature is (puestoId, prevState, formData) — bind the id
  const boundAction = editarPuesto.bind(null, puestoId)
  const [state, action, isPending] = useActionState(boundAction, initialState)
  const [modalidad, setModalidad] = useState(puesto.ubicacion)
  // Campos controlados: al fallar el guardado, React 19 resetea los <input> no
  // controlados a su defaultValue y se perderían los cambios sin guardar. El
  // estado los preserva para que solo se corrija el campo con error.
  const [values, setValues] = useState({
    empresa_id: puesto.empresa_id,
    titulo_puesto: puesto.titulo_puesto,
    descripcion_texto: puesto.descripcion_texto ?? '',
    sector_id: puesto.sector_id ?? '',
    carga_horaria: puesto.carga_horaria,
    nivel_experiencia: puesto.nivel_experiencia ?? '',
    perfil_psicologico_deseado: puesto.perfil_psicologico_deseado ?? '',
  })
  const setField =
    (campo: keyof typeof values) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setValues((v) => ({ ...v, [campo]: e.target.value }))
  const setValor = (campo: keyof typeof values) => (val: string) =>
    setValues((v) => ({ ...v, [campo]: val }))

  const fieldErrors = !state.success && state.fieldErrors ? state.fieldErrors : {}
  const ubicacionAplica = modalidad !== UBICACION.REMOTO

  const empresaOptions = empresas.map((e) => ({
    value: e.id,
    label: e.activa ? e.nombre_empresa : `${e.nombre_empresa} · de baja`,
  }))

  const sectorOptions = [
    { value: '', label: 'Sin sector' },
    ...sectores.map((s) => ({ value: s.id, label: s.nombre_sector })),
  ]

  const cargaOptions = Object.entries(CARGA_HORARIA_LABEL).map(([v, l]) => ({ value: v, label: l }))
  const ubicacionOptions = Object.entries(UBICACION_LABEL).map(([v, l]) => ({ value: v, label: l }))
  // Idioma guardado que no esté en el catálogo (puestos antiguos con texto libre)
  // se agrega como opción para no perderlo al editar.
  const idiomasBase = IDIOMAS_COMUNES.filter((i) => i !== 'Otro')
  const idiomaValores =
    puesto.idioma && !idiomasBase.includes(puesto.idioma as (typeof idiomasBase)[number])
      ? [puesto.idioma, ...idiomasBase]
      : idiomasBase
  const idiomaOptions = idiomaValores.map((i) => ({ value: i, label: i }))

  return (
    <form action={action} className="space-y-5">
      {!state.success && state.error && <Alert tone="error" title={state.error} />}
      {state.success && <Alert tone="success" title="Puesto actualizado correctamente." />}

      <Field
        label="Empresa"
        htmlFor="empresa_id"
        required
        error={fieldErrors.empresa_id?.[0]}
      >
        <FancySelect
          id="empresa_id"
          name="empresa_id"
          options={empresaOptions}
          value={values.empresa_id}
          onChange={setValor('empresa_id')}
          placeholder="Elegí la empresa"
        />
      </Field>

      <Field
        label="Título del puesto"
        htmlFor="titulo_puesto"
        required
        error={fieldErrors.titulo_puesto?.[0]}
      >
        <Input
          id="titulo_puesto"
          name="titulo_puesto"
          value={values.titulo_puesto}
          onChange={setField('titulo_puesto')}
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
          value={values.descripcion_texto}
          onChange={setField('descripcion_texto')}
          placeholder="Describí el puesto, responsabilidades y perfil buscado…"
          rows={5}
          status={fieldErrors.descripcion_texto ? 'error' : 'default'}
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Sector" htmlFor="sector_id" error={fieldErrors.sector_id?.[0]}>
          <FancySelect
            id="sector_id"
            name="sector_id"
            options={sectorOptions}
            value={values.sector_id}
            onChange={setValor('sector_id')}
          />
        </Field>

        <Field
          label="Carreras (opcional)"
          hint="Elegí una o varias. Ayuda a que los postulantes encuentren tu puesto al filtrar por carrera."
        >
          <CarrerasMultiSelect
            name="carrera_ids"
            options={carreras}
            placeholder="Agregá una o más carreras…"
            defaultValue={puesto.carreras.map((c) => c.id)}
          />
        </Field>

        <Field
          label="Idioma (opcional)"
          error={fieldErrors.idioma?.[0]}
        >
          <SearchableSelect
            name="idioma"
            options={idiomaOptions}
            defaultValue={puesto.idioma || undefined}
            placeholder="Elegí un idioma…"
          />
        </Field>

        <Field
          label="Carga horaria"
          htmlFor="carga_horaria"
          required
          error={fieldErrors.carga_horaria?.[0]}
        >
          <FancySelect
            id="carga_horaria"
            name="carga_horaria"
            options={cargaOptions}
            value={values.carga_horaria}
            onChange={setValor('carga_horaria')}
          />
        </Field>

        <Field
          label="Modalidad"
          htmlFor="ubicacion"
          required
          error={fieldErrors.ubicacion?.[0]}
        >
          <FancySelect
            id="ubicacion"
            name="ubicacion"
            options={ubicacionOptions}
            value={modalidad}
            onChange={setModalidad}
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
            value={values.nivel_experiencia}
            onChange={setField('nivel_experiencia')}
            placeholder="Ej: 3+ años, Junior, Senior"
            status={fieldErrors.nivel_experiencia ? 'error' : 'default'}
          />
        </Field>
      </div>

      {/* Ubicación geográfica: solo si la modalidad no es remota */}
      {ubicacionAplica && (
        <UbicacionSelector
          provincias={provincias}
          inicial={ubicacionInicial}
          required
          error={fieldErrors.localidad_id?.[0]}
        />
      )}

      <Field
        label="Notas privadas sobre el puesto"
        htmlFor="perfil_psicologico_deseado"
        error={fieldErrors.perfil_psicologico_deseado?.[0]}
        hint="Solo visible para vos. Los postulantes nunca verán este campo."
      >
        <Textarea
          id="perfil_psicologico_deseado"
          name="perfil_psicologico_deseado"
          value={values.perfil_psicologico_deseado}
          onChange={setField('perfil_psicologico_deseado')}
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
