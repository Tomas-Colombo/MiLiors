'use client'

import { useState } from 'react'
import { Checkbox, Field, Input, MonthYearInput, Textarea } from '@/components/ui'
import { errorDe } from './form-estado'
import { mesActual } from './opciones'
import type { ExperienciaItem } from '@/modules/perfil-tecnico/queries'
import type { ActionResult } from '@/lib/types/domain'

/**
 * Campos de una experiencia laboral. Los comparten el alta y la edición.
 *
 * El `useState` es del propio campo: "trabajo actual" oculta la fecha de fin, y
 * al editar arranca marcado si el registro guardado no tiene fecha de fin.
 */
export function ExperienciaCampos({
  item,
  state,
}: {
  item?: ExperienciaItem
  state: ActionResult
}) {
  const [trabajoActual, setTrabajoActual] = useState(() => (item ? item.fecha_fin === null : false))

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Empresa" required error={errorDe(state, 'empresa')}>
          <Input
            name="empresa"
            defaultValue={item?.empresa}
            placeholder="Ej: Acme Corp"
            status={errorDe(state, 'empresa') ? 'error' : 'default'}
          />
        </Field>
        <Field label="Puesto" required error={errorDe(state, 'puesto')}>
          <Input
            name="puesto"
            defaultValue={item?.puesto}
            placeholder="Ej: Desarrolladora Frontend"
            status={errorDe(state, 'puesto') ? 'error' : 'default'}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Inicio" required error={errorDe(state, 'fecha_inicio')}>
          <MonthYearInput
            name="fecha_inicio"
            defaultValue={item?.fecha_inicio}
            max={mesActual()}
            status={errorDe(state, 'fecha_inicio') ? 'error' : 'default'}
          />
        </Field>
        {!trabajoActual && (
          <Field label="Fin" error={errorDe(state, 'fecha_fin')}>
            <MonthYearInput
              name="fecha_fin"
              defaultValue={item?.fecha_fin ?? ''}
              max={mesActual()}
              status={errorDe(state, 'fecha_fin') ? 'error' : 'default'}
            />
          </Field>
        )}
      </div>

      <Checkbox
        label="Trabajo actual"
        checked={trabajoActual}
        onChange={(e) => setTrabajoActual(e.target.checked)}
      />

      <Field label="Descripción" hint="Opcional">
        <Textarea
          name="descripcion"
          defaultValue={item?.descripcion ?? ''}
          placeholder="Describí tus responsabilidades…"
          rows={3}
        />
      </Field>
    </>
  )
}
