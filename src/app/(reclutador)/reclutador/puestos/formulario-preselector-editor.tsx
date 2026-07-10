'use client'

import { useMemo, useState } from 'react'
import { Field, Input, Textarea, Select, Switch, Checkbox, Button, Badge, Card, Alert, Tooltip } from '@/components/ui'
import { PlusIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon, InfoIcon } from '@/components/icons'
import { TIPO_PREGUNTA_PRESELECTOR, TIPO_PREGUNTA_PRESELECTOR_LABEL } from '@/lib/constants/enums'
import type { FormularioPreselector } from '@/modules/preselector/queries'

const MAX_PREGUNTAS = 10
const MIN_OPCIONES = 2

type TipoPregunta = typeof TIPO_PREGUNTA_PRESELECTOR.OPCIONES | typeof TIPO_PREGUNTA_PRESELECTOR.TEXTO_LIBRE

type OpcionEditable = { key: string; texto: string; esValida: boolean }
type PreguntaEditable = {
  key: string
  texto: string
  tipo: TipoPregunta
  esCritica: boolean
  opciones: OpcionEditable[]
}

const tipoOptions = Object.entries(TIPO_PREGUNTA_PRESELECTOR_LABEL).map(([value, label]) => ({ value, label }))

function nuevaOpcion(): OpcionEditable {
  return { key: crypto.randomUUID(), texto: '', esValida: false }
}

function nuevaPregunta(): PreguntaEditable {
  return {
    key: crypto.randomUUID(),
    texto: '',
    tipo: TIPO_PREGUNTA_PRESELECTOR.OPCIONES,
    esCritica: false,
    opciones: [nuevaOpcion(), nuevaOpcion()],
  }
}

function desdeFormulario(formulario?: FormularioPreselector | null): PreguntaEditable[] {
  if (!formulario) return []
  return formulario.preguntas.map((p) => ({
    key: p.id,
    texto: p.texto,
    tipo: p.tipo as TipoPregunta,
    esCritica: p.esCritica,
    opciones: p.opciones.map((o) => ({ key: o.id, texto: o.texto, esValida: o.esValida })),
  }))
}

type Props = {
  /** Formulario existente (edición). `null`/`undefined` = puesto sin formulario (o alta nueva). */
  initialFormulario?: FormularioPreselector | null
  /** state.fieldErrors de la server action — muestra errores genéricos y de zod (`formulario_preselector`, `preguntas`). */
  fieldErrors?: Record<string, string[]>
  /**
   * Formulario inmutable (ya tiene respuestas de postulantes): todo se muestra
   * deshabilitado y el hidden input NO se renderiza, así el submit del puesto
   * no toca el formulario (campo ausente = sin cambios).
   */
  readOnly?: boolean
}

/**
 * Editor de formulario preselector, compartido por el alta y la edición de puestos.
 * Serializa el estado en un <input type="hidden" name="formulario_preselector">
 * según el contrato de src/modules/preselector/schema.ts:
 *  - sin preguntas y nunca hubo formulario → el input NO se renderiza (campo ausente).
 *  - sin preguntas pero había un formulario → se envía "" (señal de borrado).
 *  - con preguntas → JSON de { preguntas }.
 */
export function FormularioPreselectorEditor({ initialFormulario, fieldErrors, readOnly }: Props) {
  const [preguntas, setPreguntas] = useState<PreguntaEditable[]>(() => desdeFormulario(initialFormulario))
  const teniaFormularioInicial = !!initialFormulario

  const erroresGenerales = [
    ...(fieldErrors?.formulario_preselector ?? []),
    ...(fieldErrors?.preguntas ?? []),
  ]

  const serialized = useMemo(() => {
    if (preguntas.length > 0) {
      return JSON.stringify({
        preguntas: preguntas.map((p) => ({
          texto: p.texto,
          tipo: p.tipo,
          esCritica: p.esCritica,
          ...(p.tipo === TIPO_PREGUNTA_PRESELECTOR.OPCIONES
            ? { opciones: p.opciones.map((o) => ({ texto: o.texto, esValida: o.esValida })) }
            : {}),
        })),
      })
    }
    return teniaFormularioInicial ? '' : null
  }, [preguntas, teniaFormularioInicial])

  function actualizarPregunta(key: string, patch: Partial<PreguntaEditable>) {
    setPreguntas((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)))
  }

  function cambiarTipo(key: string, tipo: TipoPregunta) {
    setPreguntas((prev) =>
      prev.map((p) => {
        if (p.key !== key) return p
        if (tipo === TIPO_PREGUNTA_PRESELECTOR.TEXTO_LIBRE) {
          // Una pregunta de texto libre no puede ser crítica ni tener opciones.
          return { ...p, tipo, esCritica: false, opciones: [] }
        }
        const faltantes = Math.max(0, MIN_OPCIONES - p.opciones.length)
        return {
          ...p,
          tipo,
          opciones: faltantes > 0 ? [...p.opciones, ...Array.from({ length: faltantes }, nuevaOpcion)] : p.opciones,
        }
      }),
    )
  }

  function agregarPregunta() {
    setPreguntas((prev) => (prev.length >= MAX_PREGUNTAS ? prev : [...prev, nuevaPregunta()]))
  }

  function eliminarPregunta(key: string) {
    setPreguntas((prev) => prev.filter((p) => p.key !== key))
  }

  function moverPregunta(key: string, direccion: -1 | 1) {
    setPreguntas((prev) => {
      const index = prev.findIndex((p) => p.key === key)
      const target = index + direccion
      if (index < 0 || target < 0 || target >= prev.length) return prev
      const copia = [...prev]
      ;[copia[index], copia[target]] = [copia[target], copia[index]]
      return copia
    })
  }

  function agregarOpcion(preguntaKey: string) {
    setPreguntas((prev) =>
      prev.map((p) => (p.key === preguntaKey ? { ...p, opciones: [...p.opciones, nuevaOpcion()] } : p)),
    )
  }

  function eliminarOpcion(preguntaKey: string, opcionKey: string) {
    setPreguntas((prev) =>
      prev.map((p) =>
        p.key === preguntaKey ? { ...p, opciones: p.opciones.filter((o) => o.key !== opcionKey) } : p,
      ),
    )
  }

  function actualizarOpcion(preguntaKey: string, opcionKey: string, patch: Partial<OpcionEditable>) {
    setPreguntas((prev) =>
      prev.map((p) =>
        p.key === preguntaKey
          ? { ...p, opciones: p.opciones.map((o) => (o.key === opcionKey ? { ...o, ...patch } : o)) }
          : p,
      ),
    )
  }

  return (
    <div className="space-y-4">
      {!readOnly && serialized !== null && (
        <input type="hidden" name="formulario_preselector" value={serialized} />
      )}

      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-ink">Formulario preselector</h2>
          <p className="text-[13px] text-muted">
            Agregá preguntas para filtrar postulantes antes de que lleguen a vos. Las preguntas eliminatorias
            descartan automáticamente a quienes no marcan una opción válida.
          </p>
        </div>
        <Badge tone={preguntas.length >= MAX_PREGUNTAS ? 'warning' : 'neutral'} className="shrink-0">
          {preguntas.length}/{MAX_PREGUNTAS}
        </Badge>
      </div>

      {readOnly && (
        <Alert tone="info" title="Este formulario ya no se puede modificar">
          Uno o más postulantes ya respondieron estas preguntas, por eso el formulario queda bloqueado
          para no invalidar sus respuestas. El resto del puesto se puede seguir editando normalmente.
        </Alert>
      )}

      {erroresGenerales.length > 0 && (
        <Alert tone="error" title="Revisá el formulario preselector">
          <ul className="list-disc pl-4">
            {erroresGenerales.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </Alert>
      )}

      {preguntas.length === 0 && (
        <p className="text-[13px] text-neutral-400">
          Este puesto no tiene formulario de preselección. Los postulantes van a poder postularse directamente.
        </p>
      )}

      <div className="space-y-4">
        {preguntas.map((pregunta, index) => (
          <PreguntaEditor
            key={pregunta.key}
            pregunta={pregunta}
            index={index}
            total={preguntas.length}
            disabled={readOnly}
            onChange={(patch) => actualizarPregunta(pregunta.key, patch)}
            onTipoChange={(tipo) => cambiarTipo(pregunta.key, tipo)}
            onDelete={() => eliminarPregunta(pregunta.key)}
            onMoveUp={() => moverPregunta(pregunta.key, -1)}
            onMoveDown={() => moverPregunta(pregunta.key, 1)}
            onAddOpcion={() => agregarOpcion(pregunta.key)}
            onRemoveOpcion={(opcionKey) => eliminarOpcion(pregunta.key, opcionKey)}
            onOpcionChange={(opcionKey, patch) => actualizarOpcion(pregunta.key, opcionKey, patch)}
          />
        ))}
      </div>

      {!readOnly && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          leftIcon={<PlusIcon size={15} />}
          onClick={agregarPregunta}
          disabled={preguntas.length >= MAX_PREGUNTAS}
        >
          Agregar pregunta
        </Button>
      )}
    </div>
  )
}

function PreguntaEditor({
  pregunta,
  index,
  total,
  disabled,
  onChange,
  onTipoChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAddOpcion,
  onRemoveOpcion,
  onOpcionChange,
}: {
  pregunta: PreguntaEditable
  index: number
  total: number
  disabled?: boolean
  onChange: (patch: Partial<PreguntaEditable>) => void
  onTipoChange: (tipo: TipoPregunta) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onAddOpcion: () => void
  onRemoveOpcion: (opcionKey: string) => void
  onOpcionChange: (opcionKey: string, patch: Partial<OpcionEditable>) => void
}) {
  const esOpciones = pregunta.tipo === TIPO_PREGUNTA_PRESELECTOR.OPCIONES
  const necesitaMasOpciones = esOpciones && pregunta.opciones.length < MIN_OPCIONES
  const necesitaValidaCritica = esOpciones && pregunta.esCritica && !pregunta.opciones.some((o) => o.esValida)

  return (
    <Card padding="md" className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <span className="mt-2 shrink-0 text-[12px] font-semibold text-neutral-400">Pregunta {index + 1}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={disabled || index === 0}
            aria-label="Mover pregunta hacia arriba"
            className="p-1.5 rounded-md text-muted hover:text-ink hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronUpIcon size={16} />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={disabled || index === total - 1}
            aria-label="Mover pregunta hacia abajo"
            className="p-1.5 rounded-md text-muted hover:text-ink hover:bg-neutral-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronDownIcon size={16} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={disabled}
            aria-label="Eliminar pregunta"
            className="p-1.5 rounded-md text-muted hover:text-error hover:bg-error-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <TrashIcon size={16} />
          </button>
        </div>
      </div>

      <Field label="Pregunta" required>
        <Textarea
          value={pregunta.texto}
          onChange={(e) => onChange({ texto: e.target.value })}
          placeholder="Ej: ¿Contás con disponibilidad full time?"
          rows={2}
          disabled={disabled}
        />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Tipo de pregunta">
          <Select
            value={pregunta.tipo}
            options={tipoOptions}
            onChange={(e) => onTipoChange(e.target.value as TipoPregunta)}
            disabled={disabled}
          />
        </Field>
        <div className="flex items-center gap-1.5 pb-0.5 sm:items-end">
          <Switch
            checked={pregunta.esCritica}
            onCheckedChange={(checked) => onChange({ esCritica: checked })}
            disabled={disabled || !esOpciones}
            label="Pregunta eliminatoria"
          />
          <Tooltip
            content={
              <span className="block max-w-[240px] whitespace-normal text-left leading-snug">
                Descarta automáticamente al postulante que no elija una de las respuestas válidas.
                Marcá las respuestas válidas con el casillero ✓. Solo disponible en preguntas con opciones.
              </span>
            }
          >
            <InfoIcon size={15} className="text-neutral-400 transition-colors hover:text-muted" />
          </Tooltip>
        </div>
      </div>

      {esOpciones && (
        <div className="space-y-2">
          <span className="text-[13px] font-semibold text-ink-soft">Opciones</span>
          {pregunta.esCritica && (
            <p className="flex items-start gap-1.5 rounded-md bg-primary-50 px-2.5 py-1.5 text-[12px] text-ink-soft">
              <InfoIcon size={14} className="mt-0.5 shrink-0 text-primary-600" />
              <span>
                Marcá con el casillero las respuestas válidas. Quien elija cualquier otra opción será
                descartado automáticamente.
              </span>
            </p>
          )}
          {pregunta.opciones.map((opcion) => (
            <div key={opcion.key} className="flex items-center gap-2">
              <Checkbox
                checked={opcion.esValida}
                onChange={(e) => onOpcionChange(opcion.key, { esValida: e.target.checked })}
                aria-label="Marcar como opción válida"
                disabled={disabled}
              />
              <Input
                value={opcion.texto}
                onChange={(e) => onOpcionChange(opcion.key, { texto: e.target.value })}
                placeholder="Texto de la opción"
                className="flex-1"
                disabled={disabled}
              />
              <button
                type="button"
                onClick={() => onRemoveOpcion(opcion.key)}
                disabled={disabled || pregunta.opciones.length <= MIN_OPCIONES}
                aria-label="Eliminar opción"
                className="p-1.5 rounded-md text-muted hover:text-error hover:bg-error-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <TrashIcon size={14} />
              </button>
            </div>
          ))}
          {!disabled && (
            <Button type="button" variant="ghost" size="sm" leftIcon={<PlusIcon size={13} />} onClick={onAddOpcion}>
              Agregar opción
            </Button>
          )}
          {necesitaMasOpciones && <p className="text-[12px] text-error">Necesitás al menos 2 opciones.</p>}
          {necesitaValidaCritica && (
            <p className="text-[12px] text-error">
              Marcá al menos una opción como válida para que la pregunta sea eliminatoria.
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
