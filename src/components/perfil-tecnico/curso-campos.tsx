import { Field, Input, MonthYearInput } from '@/components/ui'
import { errorDe } from './form-estado'
import type { CursoItem } from '@/modules/perfil-tecnico/queries'
import type { ActionResult } from '@/lib/types/domain'

/** Campos de un curso. Los comparten el alta y la edición. */
export function CursoCampos({ item, state }: { item?: CursoItem; state: ActionResult }) {
  return (
    <>
      <Field label="Nombre del curso" required error={errorDe(state, 'nombre')}>
        <Input
          name="nombre"
          defaultValue={item?.nombre}
          placeholder="Ej: React avanzado"
          status={errorDe(state, 'nombre') ? 'error' : 'default'}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Institución o plataforma" required error={errorDe(state, 'institucion')}>
          <Input
            name="institucion"
            defaultValue={item?.institucion}
            placeholder="Ej: Coursera"
            status={errorDe(state, 'institucion') ? 'error' : 'default'}
          />
        </Field>
        <Field label="Fecha de finalización" hint="Opcional">
          <MonthYearInput name="fecha_fin" defaultValue={item?.fecha_fin ?? ''} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Duración (horas)" hint="Opcional" error={errorDe(state, 'duracion_horas')}>
          <Input
            name="duracion_horas"
            type="number"
            min={1}
            max={10000}
            defaultValue={item?.duracion_horas ?? ''}
            placeholder="Ej: 40"
            status={errorDe(state, 'duracion_horas') ? 'error' : 'default'}
          />
        </Field>
        <Field label="Link de la credencial" hint="Opcional" error={errorDe(state, 'url_credencial')}>
          <Input
            name="url_credencial"
            type="url"
            defaultValue={item?.url_credencial ?? ''}
            placeholder="https://…"
            status={errorDe(state, 'url_credencial') ? 'error' : 'default'}
          />
        </Field>
      </div>
    </>
  )
}
