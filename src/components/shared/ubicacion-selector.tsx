'use client'

import { useState, useTransition } from 'react'
import { Field, SearchableSelect } from '@/components/ui'
import type { SelectOption } from '@/components/ui/select'
import { cargarDepartamentos, cargarLocalidades } from '@/modules/ubicacion/actions'

export type ProvinciaOption = { id: string; nombre: string }

/** Cadena ya guardada + las opciones de cada nivel elegido (modo edición). */
export type UbicacionInicial = {
  provinciaId: string
  /** Vacío si sólo se guardó la provincia. */
  departamentoId: string
  /** Vacío si sólo se guardó la provincia. */
  localidadId: string
  departamentos: SelectOption[]
  localidades: SelectOption[]
}

/**
 * Nivel mínimo exigido por el formulario. Los niveles por debajo del mínimo
 * quedan como precisión opcional.
 * - `localidad`: hace falta la cadena completa y sólo se envía `localidad_id`
 *   (departamento y provincia se infieren por FK).
 * - `departamento`: alcanza con provincia + departamento. Es el caso de los
 *   puestos.
 * - `provincia`: alcanza con la provincia. Es el caso del postulante.
 *
 * El nivel mínimo viaja siempre en un input propio: si la cadena se corta ahí
 * no hay una FK más abajo desde la cual inferirlo.
 */
export type NivelUbicacion = 'provincia' | 'departamento' | 'localidad'

/** Profundidad de cada nivel, para comparar cuál queda por encima del mínimo. */
const PROFUNDIDAD: Record<NivelUbicacion, 1 | 2 | 3> = {
  provincia: 1,
  departamento: 2,
  localidad: 3,
}

interface UbicacionSelectorProps {
  provincias: ProvinciaOption[]
  inicial?: UbicacionInicial | null
  required?: boolean
  /** Ej. puesto remoto: la ubicación no aplica. */
  disabled?: boolean
  nivelRequerido?: NivelUbicacion
  /** Error de validación del campo obligatorio según `nivelRequerido`. */
  error?: string
}

/**
 * Selector de ubicación en cascada: provincia → departamento → localidad.
 * Cada nivel carga sus opciones bajo demanda y se resetea al cambiar el de
 * arriba.
 */
export function UbicacionSelector({
  provincias,
  inicial,
  required,
  disabled,
  nivelRequerido = 'localidad',
  error,
}: UbicacionSelectorProps) {
  const [provinciaId, setProvinciaId] = useState(inicial?.provinciaId ?? '')
  const [departamentoId, setDepartamentoId] = useState(inicial?.departamentoId ?? '')
  const [departamentos, setDepartamentos] = useState<SelectOption[]>(inicial?.departamentos ?? [])
  const [localidades, setLocalidades] = useState<SelectOption[]>(inicial?.localidades ?? [])
  const [pendingDep, startDep] = useTransition()
  const [pendingLoc, startLoc] = useTransition()

  const provinciaOptions: SelectOption[] = provincias.map((p) => ({ value: p.id, label: p.nombre }))

  const minimo = PROFUNDIDAD[nivelRequerido]
  const depRequerido = minimo >= PROFUNDIDAD.departamento
  const locRequerido = minimo >= PROFUNDIDAD.localidad

  function handleProvinciaChange(value: string) {
    setProvinciaId(value)
    setDepartamentoId('')
    setDepartamentos([])
    setLocalidades([])
    if (!value) return
    startDep(async () => setDepartamentos(await cargarDepartamentos(value)))
  }

  function handleDepartamentoChange(value: string) {
    setDepartamentoId(value)
    setLocalidades([])
    if (!value) return
    startLoc(async () => setLocalidades(await cargarLocalidades(value)))
  }

  if (disabled) {
    // Ubicación no aplica (ej. puesto remoto): no se envía localidad.
    return null
  }

  // Lo guardado sólo aplica mientras no se cambie el nivel de arriba.
  const departamentoDefault = provinciaId === inicial?.provinciaId ? inicial.departamentoId : undefined
  const localidadDefault = departamentoId === inicial?.departamentoId ? inicial.localidadId : undefined

  // El error se muestra bajo el campo que hay que corregir: el primero de la
  // cadena que falta, sin pasarse del nivel mínimo exigido.
  const errorEn =
    !provinciaId || !depRequerido
      ? 'provincia'
      : !departamentoId || !locRequerido
        ? 'departamento'
        : 'localidad'

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {/* El nivel mínimo viaja en su propio input: puede ser el último dato
          cargado y entonces no hay FK más abajo desde la cual inferirlo. */}
      {minimo === PROFUNDIDAD.provincia && (
        <input type="hidden" name="provincia_id" value={provinciaId} />
      )}
      {minimo === PROFUNDIDAD.departamento && (
        <input type="hidden" name="departamento_id" value={departamentoId} />
      )}

      <Field label="Provincia" required={required} error={errorEn === 'provincia' ? error : undefined}>
        <SearchableSelect
          options={provinciaOptions}
          placeholder="Elegí una provincia…"
          defaultValue={inicial?.provinciaId}
          onValueChange={handleProvinciaChange}
        />
      </Field>

      {/* Cada nivel aparece recién cuando el de arriba está elegido. */}
      {provinciaId && (
        <Field
          label="Departamento"
          required={required && depRequerido}
          hint={depRequerido ? undefined : 'Opcional'}
          error={errorEn === 'departamento' ? error : undefined}
        >
          {/* key=provinciaId → se remonta y resetea al cambiar de provincia */}
          <SearchableSelect
            key={provinciaId}
            options={departamentos}
            defaultValue={departamentoDefault}
            loading={pendingDep}
            placeholder={pendingDep ? 'Cargando departamentos…' : 'Elegí un departamento…'}
            onValueChange={handleDepartamentoChange}
          />
        </Field>
      )}

      {departamentoId && (
        <Field
          label="Localidad"
          required={required && locRequerido}
          hint={locRequerido ? undefined : 'Opcional'}
          error={errorEn === 'localidad' ? error : undefined}
        >
          <SearchableSelect
            key={departamentoId}
            name="localidad_id"
            options={localidades}
            defaultValue={localidadDefault}
            loading={pendingLoc}
            placeholder={pendingLoc ? 'Cargando localidades…' : 'Elegí una localidad…'}
          />
        </Field>
      )}
    </div>
  )
}
