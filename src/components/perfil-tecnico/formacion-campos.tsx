'use client'

import { useState } from 'react'
import { Field, Input, MonthYearInput, SearchableSelect } from '@/components/ui'
import { errorDe } from './form-estado'
import {
  mesActual,
  OTRA_INSTITUCION,
  OTRO_TITULO,
  esInstitucionLibre,
  esTituloLibre,
  universidadOptions,
} from './opciones'
import type { CarreraOption } from '@/modules/carreras/queries'
import type { FormacionItem } from '@/modules/perfil-tecnico/queries'
import type { ActionResult } from '@/lib/types/domain'

/**
 * Campos de una formación académica. Los comparten el alta y la edición: lo
 * único que cambia entre las dos es de dónde salen los valores por defecto.
 *
 * Los `useState` son del propio campo, no de la sección: deciden si se muestra
 * el input libre de institución o el de título, y sólo dependen de lo elegido
 * en el select de arriba de cada uno.
 *
 * El título sale del catálogo de carreras que administra el back office. Como
 * `formacion_academica.titulo` es texto, el select manda el nombre de la
 * carrera y no su id: no hay que resolver nada del lado del servidor.
 */
export function FormacionCampos({
  item,
  state,
  carreras,
}: {
  item?: FormacionItem
  state: ActionResult
  carreras: CarreraOption[]
}) {
  const esLibre = item ? esInstitucionLibre(item.institucion) : false
  const [institucion, setInstitucion] = useState(
    item ? (esLibre ? OTRA_INSTITUCION : item.institucion) : '',
  )

  // El nombre de la carrera es el valor: el catálogo lo tiene con nombre único.
  const tituloOptions = [
    ...carreras.map((c) => ({ value: c.label, label: c.label })),
    { value: OTRO_TITULO, label: 'Otro (no está en la lista)' },
  ]
  const tituloEsLibre = item ? esTituloLibre(item.titulo, carreras) : false
  const [titulo, setTitulo] = useState(
    item ? (tituloEsLibre ? OTRO_TITULO : item.titulo) : '',
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
        <SearchableSelect
          name="titulo"
          options={tituloOptions}
          placeholder="Buscá o seleccioná la carrera"
          defaultValue={item ? (tituloEsLibre ? OTRO_TITULO : item.titulo) : undefined}
          onValueChange={setTitulo}
        />
      </Field>

      {titulo === OTRO_TITULO && (
        <Field
          label="Nombre del título"
          required
          hint="Ingresalo tal cual figura en tu diploma."
          error={errorDe(state, 'titulo_personalizado')}
        >
          <Input
            name="titulo_personalizado"
            defaultValue={tituloEsLibre ? item?.titulo : ''}
            placeholder="Ej: Lic. en Sistemas"
          />
        </Field>
      )}

      <Field
        label="Fecha de graduación"
        hint="Opcional"
        error={errorDe(state, 'fecha_graduacion')}
      >
        <MonthYearInput
          name="fecha_graduacion"
          defaultValue={item?.fecha_graduacion ?? ''}
          max={mesActual()}
          status={errorDe(state, 'fecha_graduacion') ? 'error' : 'default'}
        />
      </Field>
    </>
  )
}
