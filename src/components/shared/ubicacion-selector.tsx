'use client'

import { useState, useTransition } from 'react'
import { Field, SearchableSelect } from '@/components/ui'
import type { SelectOption } from '@/components/ui/select'
import { cargarDepartamentos, cargarLocalidades } from '@/modules/ubicacion/actions'

export type ProvinciaOption = { id: string; nombre: string }

/** Cadena ya guardada + las opciones de cada nivel elegido (modo edición). */
export type UbicacionInicial = {
  provinciaId: string
  departamentoId: string
  localidadId: string
  departamentos: SelectOption[]
  localidades: SelectOption[]
}

interface UbicacionSelectorProps {
  provincias: ProvinciaOption[]
  inicial?: UbicacionInicial | null
  required?: boolean
  /** Ej. puesto remoto: la ubicación no aplica. */
  disabled?: boolean
  /** Error de validación de `localidad_id` (el único campo que se envía). */
  error?: string
}

/**
 * Selector de ubicación en cascada: provincia → departamento → localidad.
 * Cada nivel carga sus opciones bajo demanda y se resetea al cambiar el de
 * arriba. Sólo escribe <input hidden name="localidad_id">: el departamento y la
 * provincia se infieren de la localidad por FK, no se guardan por separado.
 */
export function UbicacionSelector({
  provincias,
  inicial,
  required,
  disabled,
  error,
}: UbicacionSelectorProps) {
  const [provinciaId, setProvinciaId] = useState(inicial?.provinciaId ?? '')
  const [departamentoId, setDepartamentoId] = useState(inicial?.departamentoId ?? '')
  const [departamentos, setDepartamentos] = useState<SelectOption[]>(inicial?.departamentos ?? [])
  const [localidades, setLocalidades] = useState<SelectOption[]>(inicial?.localidades ?? [])
  const [pendingDep, startDep] = useTransition()
  const [pendingLoc, startLoc] = useTransition()

  const provinciaOptions: SelectOption[] = provincias.map((p) => ({ value: p.id, label: p.nombre }))

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

  // El error de localidad se muestra bajo el último campo visible: si todavía
  // no eligió provincia, ahí es donde tiene que ir a corregir.
  const errorEn = !provinciaId ? 'provincia' : !departamentoId ? 'departamento' : 'localidad'

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          required={required}
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
        <Field label="Localidad" required={required} error={errorEn === 'localidad' ? error : undefined}>
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
