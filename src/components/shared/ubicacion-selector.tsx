'use client'

import { useState, useTransition } from 'react'
import { Field, SearchableSelect } from '@/components/ui'
import type { SelectOption } from '@/components/ui/select'
import { cargarLocalidades } from '@/modules/ubicacion/actions'

export type ProvinciaOption = { id: string; nombre: string }

interface UbicacionSelectorProps {
  provincias: ProvinciaOption[]
  /** Provincia/localidad ya guardadas (modo edición). */
  defaultProvinciaId?: string
  defaultLocalidadId?: string
  /** Localidades de la provincia inicial (para mostrar la etiqueta sin recargar). */
  defaultLocalidades?: SelectOption[]
  required?: boolean
  /** Ej. puesto remoto: la ubicación no aplica. */
  disabled?: boolean
  provinciaError?: string
  localidadError?: string
}

/**
 * Selector de ubicación (provincia + localidad) reutilizable.
 * - Provincia: combobox con búsqueda restringido a la lista.
 * - Localidad: depende de la provincia; sus opciones se cargan bajo demanda
 *   (no se traen las ~4000 de una vez). Se resetea al cambiar de provincia.
 * Escribe los valores en <input hidden name="provincia_id"> y "localidad_id".
 */
export function UbicacionSelector({
  provincias,
  defaultProvinciaId,
  defaultLocalidadId,
  defaultLocalidades = [],
  required,
  disabled,
  provinciaError,
  localidadError,
}: UbicacionSelectorProps) {
  const [provinciaId, setProvinciaId] = useState(defaultProvinciaId ?? '')
  const [localidades, setLocalidades] = useState<SelectOption[]>(defaultLocalidades)
  const [pending, startTransition] = useTransition()

  const provinciaOptions: SelectOption[] = provincias.map((p) => ({ value: p.id, label: p.nombre }))

  function handleProvinciaChange(value: string) {
    setProvinciaId(value)
    setLocalidades([])
    if (!value) return
    startTransition(async () => {
      const opciones = await cargarLocalidades(value)
      setLocalidades(opciones)
    })
  }

  if (disabled) {
    // Ubicación no aplica (ej. puesto remoto): no se envía provincia/localidad.
    return null
  }

  // La localidad guardada solo aplica mientras no se cambie de provincia.
  const localidadDefault = provinciaId === defaultProvinciaId ? defaultLocalidadId : undefined

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Provincia" required={required} error={provinciaError}>
        <SearchableSelect
          name="provincia_id"
          options={provinciaOptions}
          placeholder="Elegí una provincia…"
          defaultValue={defaultProvinciaId}
          onValueChange={handleProvinciaChange}
        />
      </Field>

      {/* La localidad solo se puede elegir después de la provincia: hasta
          entonces el campo no se muestra. */}
      {provinciaId && (
        <Field label="Localidad" required={required} error={localidadError}>
          {/* key=provinciaId → se remonta y resetea al cambiar de provincia */}
          <SearchableSelect
            key={provinciaId}
            name="localidad_id"
            options={localidades}
            defaultValue={localidadDefault}
            placeholder={pending ? 'Cargando localidades…' : 'Elegí una localidad…'}
          />
        </Field>
      )}
    </div>
  )
}
