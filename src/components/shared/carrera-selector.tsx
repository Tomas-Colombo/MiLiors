'use client'

import { useState } from 'react'
import { Field, SearchableSelect, Alert, inputClassName } from '@/components/ui'
import type { SelectOption } from '@/components/ui/select'

const OTRA_VALUE = '__OTRA__'
// `alwaysVisible`: la salida de emergencia no se filtra con la búsqueda. Antes
// era una opción más de la lista, así que tipear una carrera que el catálogo no
// tiene la hacía desaparecer y el panel quedaba en "Sin resultados": el
// postulante no tenía forma de cargar su título.
const OTRA_OPTION: SelectOption = {
  value: OTRA_VALUE,
  label: 'Otra (no está en la lista)',
  alwaysVisible: true,
}

export type CarreraOption = { value: string; label: string }

interface CarreraSelectorProps {
  carreras: CarreraOption[]
  defaultCarreraId?: string | null
  defaultCarreraOtra?: string | null
  required?: boolean
  carreraIdError?: string
  carreraOtraError?: string
}

/**
 * Selector de carrera/título reutilizable.
 * - Combobox con búsqueda restringido a la lista de carreras activas.
 * - Si el usuario elige "Otra", se muestra un campo de texto libre con una
 *   advertencia (el título ingresado no queda validado contra el listado oficial).
 * Escribe el valor en <input hidden name="carrera_id"> o <input name="carrera_otra">,
 * pero nunca ambos a la vez.
 */
export function CarreraSelector({
  carreras,
  defaultCarreraId,
  defaultCarreraOtra,
  required,
  carreraIdError,
  carreraOtraError,
}: CarreraSelectorProps) {
  const [seleccion, setSeleccion] = useState(
    defaultCarreraOtra ? OTRA_VALUE : (defaultCarreraId ?? '')
  )
  const [carreraOtra, setCarreraOtra] = useState(defaultCarreraOtra ?? '')
  // Lo último tipeado en el buscador. Si termina eligiendo "Otra", ese texto ya
  // es el título que estaba intentando cargar: se usa como valor inicial del
  // campo libre en vez de hacerlo escribir todo de nuevo.
  const [busqueda, setBusqueda] = useState('')

  const options: SelectOption[] = [...carreras, OTRA_OPTION]
  const esOtra = seleccion === OTRA_VALUE

  function handleSeleccion(valor: string) {
    setSeleccion(valor)
    if (valor === OTRA_VALUE && !carreraOtra && busqueda.trim()) {
      setCarreraOtra(busqueda.trim())
    }
  }

  return (
    <Field
      label="¿Qué estudiaste / qué buscás?"
      required={required}
      error={carreraIdError ?? carreraOtraError}
    >
      <div className="space-y-2">
        <SearchableSelect
          name="__carrera_select"
          options={options}
          placeholder="Elegí tu carrera…"
          defaultValue={seleccion || undefined}
          onValueChange={handleSeleccion}
          onQueryChange={setBusqueda}
        />

        {esOtra && (
          <div className="space-y-2">
            <Alert
              tone="warning"
              title="Ingresá tu título tal cual está en el diploma."
            />
            <input
              type="text"
              name="carrera_otra"
              value={carreraOtra}
              onChange={(e) => setCarreraOtra(e.target.value)}
              placeholder="Ej: Licenciatura en Recursos Humanos"
              className={inputClassName()}
            />
          </div>
        )}

        <input type="hidden" name="carrera_id" value={esOtra ? '' : seleccion} />
        {!esOtra && <input type="hidden" name="carrera_otra" value="" />}
      </div>
    </Field>
  )
}
