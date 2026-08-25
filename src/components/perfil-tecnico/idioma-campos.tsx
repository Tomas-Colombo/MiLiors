'use client'

import { useState } from 'react'
import { Field, Input, SearchableSelect, Select } from '@/components/ui'
import { errorDe } from './form-estado'
import { OTRO_IDIOMA, idiomaOptions, nivelIdiomaOptions } from './opciones'
import type { ActionResult } from '@/lib/types/domain'

/**
 * Campos de un idioma. No hay edición: un idioma se borra y se vuelve a cargar,
 * así que no recibe `item`.
 *
 * El `useState` decide si se pide el nombre libre, igual que en formación.
 */
export function IdiomaCampos({ state }: { state: ActionResult }) {
  const [idioma, setIdioma] = useState('')

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Idioma" required error={errorDe(state, 'nombre')}>
          <SearchableSelect
            name="nombre"
            options={idiomaOptions}
            placeholder="Buscá o seleccioná"
            onValueChange={setIdioma}
          />
        </Field>
        <Field label="Nivel" required error={errorDe(state, 'nivel_idioma')}>
          <Select name="nivel_idioma" options={nivelIdiomaOptions} placeholder="Seleccioná" />
        </Field>
      </div>

      {idioma === OTRO_IDIOMA && (
        <Field label="Nombre del idioma" required error={errorDe(state, 'nombre_personalizado')}>
          <Input name="nombre_personalizado" placeholder="Ej: Catalán" />
        </Field>
      )}
    </>
  )
}
