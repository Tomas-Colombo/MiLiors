'use client'

import { useState } from 'react'
import { Field, Input, MonthYearInput, SearchableSelect } from '@/components/ui'
import { errorDe } from './form-estado'
import { OTRA_INSTITUCION, esInstitucionLibre, universidadOptions } from './opciones'
import type { FormacionItem } from '@/modules/perfil-tecnico/queries'
import type { ActionResult } from '@/lib/types/domain'

/**
 * Campos de una formación académica. Los comparten el alta y la edición: lo
 * único que cambia entre las dos es de dónde salen los valores por defecto.
 *
 * El `useState` es del propio campo, no de la sección: decide si se muestra el
 * input de institución libre, y sólo depende de lo elegido en el select de
 * arriba.
 */
export function FormacionCampos({ item, state }: { item?: FormacionItem; state: ActionResult }) {
  const esLibre = item ? esInstitucionLibre(item.institucion) : false
  const [institucion, setInstitucion] = useState(
    item ? (esLibre ? OTRA_INSTITUCION : item.institucion) : '',
  )

  return (
    <>
      <Field label="Institución" required error={errorDe(state, 'institucion')}>
        <SearchableSelect
          name="institucion"
          options={universidadOptions}
          placeholder="Buscá o seleccioná la institución"
          defaultValue={item ? (esLibre ? OTRA_INSTITUCION : item.institucion) : undefined}
          onValueChange={setInstitucion}
        />
      </Field>

      {institucion === OTRA_INSTITUCION && (
        <Field
          label="Nombre de la institución"
          required
          error={errorDe(state, 'institucion_personalizada')}
        >
          <Input
            name="institucion_personalizada"
            defaultValue={esLibre ? item?.institucion : ''}
            placeholder="Ej: Instituto Superior de Diseño"
          />
        </Field>
      )}

      <Field label="Título" required error={errorDe(state, 'titulo')}>
        <Input
          name="titulo"
          defaultValue={item?.titulo}
          placeholder="Ej: Lic. en Sistemas"
          status={errorDe(state, 'titulo') ? 'error' : 'default'}
        />
      </Field>

      <Field label="Fecha de graduación" hint="Opcional">
        <MonthYearInput name="fecha_graduacion" defaultValue={item?.fecha_graduacion ?? ''} />
      </Field>
    </>
  )
}
