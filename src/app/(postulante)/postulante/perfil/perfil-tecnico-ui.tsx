'use client'

import { useActionState, useTransition, useState, useRef } from 'react'
import { Tabs, Field, Input, Textarea, Select, Alert, Chip, Button } from '@/components/ui'
import type { InputProps } from '@/components/ui/input'
import { CalendarIcon } from '@/components/icons'
import { NIVEL_IDIOMA_LABEL } from '@/lib/constants/enums'
import {
  agregarFormacion,
  editarFormacion,
  eliminarFormacion,
  agregarExperiencia,
  editarExperiencia,
  eliminarExperiencia,
  agregarIdioma,
  eliminarIdioma,
  guardarCompetencias,
} from '@/modules/perfil-tecnico/actions'
import type { PerfilTecnicoCompleto, CompetenciaItem, FormacionItem, ExperienciaItem, IdiomaItem } from '@/modules/perfil-tecnico/queries'
import type { ActionResult } from '@/lib/types/domain'

// ─── MONTH/YEAR INPUT ────────────────────────────────────────────────────────
// Accepts/shows MM/AAAA, submits YYYY-MM via hidden input.

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

function formatMesAnio(fecha: string | null | undefined): string | null {
  if (!fecha) return null
  const [year, month] = fecha.split('-')
  if (!year || !month) return fecha
  const mes = MESES[parseInt(month, 10) - 1]
  const mesLabel = mes ? mes.charAt(0).toUpperCase() + mes.slice(1) : ''
  return mesLabel ? `${mesLabel} ${year}` : fecha
}

function toDisplay(yyyymm?: string | null): string {
  if (!yyyymm) return ''
  const [y, m] = yyyymm.split('-')
  return m && y ? `${m}/${y}` : ''
}

function toYYYYMM(display: string): string {
  const match = display.match(/^(\d{2})\/(\d{4})$/)
  return match ? `${match[2]}-${match[1]}` : ''
}

function MonthYearInput({ name, defaultValue, status, ...rest }: Omit<InputProps, 'type' | 'value' | 'onChange'> & { name: string; defaultValue?: string }) {
  const [display, setDisplay] = useState(() => toDisplay(defaultValue))
  const pickerRef = useRef<HTMLInputElement>(null)
  const hidden = toYYYYMM(display)

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const prev = display
    let v = e.target.value.replace(/[^\d/]/g, '')
    if (v.length === 2 && !v.includes('/') && prev.length < 2) v = v + '/'
    if (v.length <= 7) setDisplay(v)
  }

  function handlePickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    // picker returns YYYY-MM
    setDisplay(toDisplay(e.target.value))
  }

  function openPicker() {
    try {
      pickerRef.current?.showPicker()
    } catch {
      pickerRef.current?.click()
    }
  }

  return (
    <>
      <input type="hidden" name={name} value={hidden} />
      {/* Hidden native month picker — triggered by the calendar button */}
      <input
        ref={pickerRef}
        type="month"
        value={hidden}
        onChange={handlePickerChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      <div className="relative">
        <Input
          value={display}
          onChange={handleTextChange}
          placeholder="MM/AAAA"
          maxLength={7}
          status={status}
          inputMode="numeric"
          className="pr-9"
          {...rest}
        />
        <button
          type="button"
          onClick={openPicker}
          tabIndex={-1}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
          aria-label="Seleccionar mes y año"
        >
          <CalendarIcon size={16} />
        </button>
      </div>
    </>
  )
}

const INITIAL_STATE: ActionResult = { success: false, error: '' }

// ─── NIVEL IDIOMA options ──────────────────────────────────────────────────────
const nivelIdiomaOptions = Object.entries(NIVEL_IDIOMA_LABEL).map(([value, label]) => ({ value, label }))

// ─── FORMACIÓN ────────────────────────────────────────────────────────────────

function FormacionForm({
  onSuccess,
}: {
  onSuccess: () => void
}) {
  const [state, action, pending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await agregarFormacion(prev, formData)
      if (result.success) onSuccess()
      return result
    },
    INITIAL_STATE
  )

  return (
    <form action={action} className="mt-4 space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-[13px] font-semibold text-ink">Agregar formación</p>
      <Field label="Institución" required error={state.success === false && state.fieldErrors?.institucion?.[0]}>
        <Input name="institucion" placeholder="Ej: Universidad de Buenos Aires" status={state.success === false && state.fieldErrors?.institucion ? 'error' : 'default'} />
      </Field>
      <Field label="Título" required error={state.success === false && state.fieldErrors?.titulo?.[0]}>
        <Input name="titulo" placeholder="Ej: Lic. en Sistemas" status={state.success === false && state.fieldErrors?.titulo ? 'error' : 'default'} />
      </Field>
      <Field label="Fecha de graduación" hint="Opcional">
        <MonthYearInput name="fecha_graduacion" />
      </Field>
      {state.success === false && state.error && !state.fieldErrors && (
        <Alert tone="error">{state.error}</Alert>
      )}
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Guardando…' : 'Agregar'}
      </Button>
    </form>
  )
}

function FormacionEditForm({
  item,
  onSuccess,
  onCancel,
}: {
  item: FormacionItem
  onSuccess: () => void
  onCancel: () => void
}) {
  const boundAction = editarFormacion.bind(null, item.id)
  const [state, action, pending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await boundAction(prev, formData)
      if (result.success) onSuccess()
      return result
    },
    INITIAL_STATE
  )

  return (
    <form action={action} className="space-y-3 rounded-xl border border-primary-200 bg-primary-tint/30 p-4">
      <Field label="Institución" required error={state.success === false && state.fieldErrors?.institucion?.[0]}>
        <Input name="institucion" defaultValue={item.institucion} status={state.success === false && state.fieldErrors?.institucion ? 'error' : 'default'} />
      </Field>
      <Field label="Título" required error={state.success === false && state.fieldErrors?.titulo?.[0]}>
        <Input name="titulo" defaultValue={item.titulo} status={state.success === false && state.fieldErrors?.titulo ? 'error' : 'default'} />
      </Field>
      <Field label="Fecha de graduación" hint="Opcional">
        <MonthYearInput name="fecha_graduacion" defaultValue={item.fecha_graduacion ?? ''} />
      </Field>
      {state.success === false && state.error && !state.fieldErrors && (
        <Alert tone="error">{state.error}</Alert>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>{pending ? 'Guardando…' : 'Guardar'}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  )
}

function SeccionFormacion({ formaciones }: { formaciones: FormacionItem[] }) {
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleEliminar(id: string) {
    if (!confirm('¿Eliminás esta formación?')) return
    startTransition(async () => {
      await eliminarFormacion(id)
    })
  }

  return (
    <div className="space-y-3">
      {formaciones.length === 0 && (
        <p className="text-sm text-muted">Todavía no cargaste formación académica.</p>
      )}
      {formaciones.map((f) =>
        editando === f.id ? (
          <FormacionEditForm
            key={f.id}
            item={f}
            onSuccess={() => setEditando(null)}
            onCancel={() => setEditando(null)}
          />
        ) : (
          <div key={f.id} className="flex items-start justify-between gap-2 rounded-xl border border-neutral-200 bg-surface p-4">
            <div>
              <p className="text-[14px] font-semibold text-ink">{f.titulo}</p>
              <p className="text-[13px] text-muted">{f.institucion}</p>
              {f.fecha_graduacion && (
                <p className="text-[12px] text-neutral-400">{formatMesAnio(f.fecha_graduacion)}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditando(f.id)}>Editar</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => handleEliminar(f.id)} disabled={isPending}>Eliminar</Button>
            </div>
          </div>
        )
      )}
      {mostrarForm ? (
        <FormacionForm onSuccess={() => setMostrarForm(false)} />
      ) : (
        <Button type="button" size="sm" variant="ghost" onClick={() => setMostrarForm(true)}>
          + Agregar formación
        </Button>
      )}
    </div>
  )
}

// ─── EXPERIENCIA ──────────────────────────────────────────────────────────────

function ExperienciaForm({ onSuccess }: { onSuccess: () => void }) {
  const [trabajoActual, setTrabajoActual] = useState(false)
  const [state, action, pending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await agregarExperiencia(prev, formData)
      if (result.success) onSuccess()
      return result
    },
    INITIAL_STATE
  )

  return (
    <form action={action} className="mt-4 space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-[13px] font-semibold text-ink">Agregar experiencia</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Empresa" required error={state.success === false && state.fieldErrors?.empresa?.[0]}>
          <Input name="empresa" placeholder="Ej: Acme Corp" status={state.success === false && state.fieldErrors?.empresa ? 'error' : 'default'} />
        </Field>
        <Field label="Puesto" required error={state.success === false && state.fieldErrors?.puesto?.[0]}>
          <Input name="puesto" placeholder="Ej: Desarrolladora Frontend" status={state.success === false && state.fieldErrors?.puesto ? 'error' : 'default'} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Inicio" required error={state.success === false && state.fieldErrors?.fecha_inicio?.[0]}>
          <MonthYearInput name="fecha_inicio" status={state.success === false && state.fieldErrors?.fecha_inicio ? 'error' : 'default'} />
        </Field>
        {!trabajoActual && (
          <Field label="Fin" error={state.success === false && state.fieldErrors?.fecha_fin?.[0]}>
            <MonthYearInput name="fecha_fin" />
          </Field>
        )}
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-soft">
        <input
          type="checkbox"
          checked={trabajoActual}
          onChange={(e) => setTrabajoActual(e.target.checked)}
          className="h-4 w-4 rounded border-neutral-300 accent-primary-600"
        />
        Trabajo actual
      </label>
      <Field label="Descripción" hint="Opcional">
        <Textarea name="descripcion" placeholder="Describí tus responsabilidades…" rows={3} />
      </Field>
      {state.success === false && state.error && !state.fieldErrors && (
        <Alert tone="error">{state.error}</Alert>
      )}
      <Button type="submit" size="sm" disabled={pending}>{pending ? 'Guardando…' : 'Agregar'}</Button>
    </form>
  )
}

function ExperienciaEditForm({
  item,
  onSuccess,
  onCancel,
}: {
  item: ExperienciaItem
  onSuccess: () => void
  onCancel: () => void
}) {
  const [trabajoActual, setTrabajoActual] = useState(() => item.fecha_fin === null)
  const boundAction = editarExperiencia.bind(null, item.id)
  const [state, action, pending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await boundAction(prev, formData)
      if (result.success) onSuccess()
      return result
    },
    INITIAL_STATE
  )

  return (
    <form action={action} className="space-y-3 rounded-xl border border-primary-200 bg-primary-tint/30 p-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Empresa" required error={state.success === false && state.fieldErrors?.empresa?.[0]}>
          <Input name="empresa" defaultValue={item.empresa} status={state.success === false && state.fieldErrors?.empresa ? 'error' : 'default'} />
        </Field>
        <Field label="Puesto" required error={state.success === false && state.fieldErrors?.puesto?.[0]}>
          <Input name="puesto" defaultValue={item.puesto} status={state.success === false && state.fieldErrors?.puesto ? 'error' : 'default'} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Inicio" required error={state.success === false && state.fieldErrors?.fecha_inicio?.[0]}>
          <MonthYearInput name="fecha_inicio" defaultValue={item.fecha_inicio} status={state.success === false && state.fieldErrors?.fecha_inicio ? 'error' : 'default'} />
        </Field>
        {!trabajoActual && (
          <Field label="Fin" error={state.success === false && state.fieldErrors?.fecha_fin?.[0]}>
            <MonthYearInput name="fecha_fin" defaultValue={item.fecha_fin ?? ''} />
          </Field>
        )}
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-soft">
        <input
          type="checkbox"
          checked={trabajoActual}
          onChange={(e) => setTrabajoActual(e.target.checked)}
          className="h-4 w-4 rounded border-neutral-300 accent-primary-600"
        />
        Trabajo actual
      </label>
      <Field label="Descripción">
        <Textarea name="descripcion" defaultValue={item.descripcion ?? ''} rows={3} />
      </Field>
      {state.success === false && state.error && !state.fieldErrors && (
        <Alert tone="error">{state.error}</Alert>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>{pending ? 'Guardando…' : 'Guardar'}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </form>
  )
}

function SeccionExperiencia({ experiencias }: { experiencias: ExperienciaItem[] }) {
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleEliminar(id: string) {
    if (!confirm('¿Eliminás esta experiencia?')) return
    startTransition(async () => {
      await eliminarExperiencia(id)
    })
  }

  return (
    <div className="space-y-3">
      {experiencias.length === 0 && (
        <p className="text-sm text-muted">Todavía no cargaste experiencia laboral.</p>
      )}
      {experiencias.map((e) =>
        editando === e.id ? (
          <ExperienciaEditForm
            key={e.id}
            item={e}
            onSuccess={() => setEditando(null)}
            onCancel={() => setEditando(null)}
          />
        ) : (
          <div key={e.id} className="flex items-start justify-between gap-2 rounded-xl border border-neutral-200 bg-surface p-4">
            <div>
              <p className="text-[14px] font-semibold text-ink">{e.puesto}</p>
              <p className="text-[13px] text-muted">{e.empresa}</p>
              <p className="text-[12px] text-neutral-400">
                {formatMesAnio(e.fecha_inicio)} – {formatMesAnio(e.fecha_fin) ?? 'Actualidad'}
              </p>
              {e.descripcion && (
                <p className="mt-1 text-[12px] text-neutral-500 line-clamp-2">{e.descripcion}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditando(e.id)}>Editar</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => handleEliminar(e.id)} disabled={isPending}>Eliminar</Button>
            </div>
          </div>
        )
      )}
      {mostrarForm ? (
        <ExperienciaForm onSuccess={() => setMostrarForm(false)} />
      ) : (
        <Button type="button" size="sm" variant="ghost" onClick={() => setMostrarForm(true)}>
          + Agregar experiencia
        </Button>
      )}
    </div>
  )
}

// ─── IDIOMAS ──────────────────────────────────────────────────────────────────

function IdiomaForm({ onSuccess }: { onSuccess: () => void }) {
  const [state, action, pending] = useActionState(
    async (prev: ActionResult, formData: FormData) => {
      const result = await agregarIdioma(prev, formData)
      if (result.success) onSuccess()
      return result
    },
    INITIAL_STATE
  )

  return (
    <form action={action} className="mt-4 space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-[13px] font-semibold text-ink">Agregar idioma</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Idioma" required error={state.success === false && state.fieldErrors?.nombre?.[0]}>
          <Input name="nombre" placeholder="Ej: Inglés" status={state.success === false && state.fieldErrors?.nombre ? 'error' : 'default'} />
        </Field>
        <Field label="Nivel" required error={state.success === false && state.fieldErrors?.nivel_idioma?.[0]}>
          <Select name="nivel_idioma" options={nivelIdiomaOptions} placeholder="Seleccioná" />
        </Field>
      </div>
      {state.success === false && state.error && !state.fieldErrors && (
        <Alert tone="error">{state.error}</Alert>
      )}
      <Button type="submit" size="sm" disabled={pending}>{pending ? 'Guardando…' : 'Agregar'}</Button>
    </form>
  )
}

function SeccionIdiomas({ idiomas }: { idiomas: IdiomaItem[] }) {
  const [mostrarForm, setMostrarForm] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleEliminar(id: string) {
    if (!confirm('¿Eliminás este idioma?')) return
    startTransition(async () => {
      await eliminarIdioma(id)
    })
  }

  return (
    <div className="space-y-3">
      {idiomas.length === 0 && (
        <p className="text-sm text-muted">Todavía no cargaste idiomas.</p>
      )}
      {idiomas.map((i) => (
        <div key={i.id} className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-surface p-4">
          <div>
            <p className="text-[14px] font-semibold text-ink">{i.nombre}</p>
            <p className="text-[12px] text-muted">{NIVEL_IDIOMA_LABEL[i.nivel_idioma] ?? i.nivel_idioma}</p>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={() => handleEliminar(i.id)} disabled={isPending}>Eliminar</Button>
        </div>
      ))}
      {mostrarForm ? (
        <IdiomaForm onSuccess={() => setMostrarForm(false)} />
      ) : (
        <Button type="button" size="sm" variant="ghost" onClick={() => setMostrarForm(true)}>
          + Agregar idioma
        </Button>
      )}
    </div>
  )
}

// ─── COMPETENCIAS ─────────────────────────────────────────────────────────────

function SeccionCompetencias({
  catalogo,
  actuales,
}: {
  catalogo: CompetenciaItem[]
  actuales: CompetenciaItem[]
}) {
  const [seleccionadas, setSeleccionadas] = useState<string[]>(actuales.map((c) => c.id))
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)

  function toggleCompetencia(id: string) {
    setSeleccionadas((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  function handleGuardar() {
    startTransition(async () => {
      const result = await guardarCompetencias(seleccionadas)
      setFeedback(result.success ? { ok: true, msg: 'Competencias guardadas.' } : { ok: false, msg: result.error })
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-muted">Seleccioná hasta 15 competencias del catálogo.</p>
      <div className="flex flex-wrap gap-2">
        {catalogo.map((c) => {
          const selected = seleccionadas.includes(c.id)
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleCompetencia(c.id)}
              disabled={!selected && seleccionadas.length >= 15}
              className="cursor-pointer disabled:opacity-40"
            >
              <Chip selected={selected}>{c.nombre}</Chip>
            </button>
          )
        })}
      </div>
      {feedback && (
        <Alert tone={feedback.ok ? 'success' : 'error'}>{feedback.msg}</Alert>
      )}
      <div className="flex items-center gap-3">
        <Button type="button" size="sm" onClick={handleGuardar} disabled={isPending}>
          {isPending ? 'Guardando…' : 'Guardar selección'}
        </Button>
        <span className="text-[12px] text-muted">{seleccionadas.length}/15 seleccionadas</span>
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const TAB_ITEMS = [
  { id: 'formacion', label: 'Formación' },
  { id: 'experiencia', label: 'Experiencia' },
  { id: 'idiomas', label: 'Idiomas' },
  { id: 'competencias', label: 'Competencias' },
]

export function PerfilTecnicoUI({
  perfil,
  competenciasCatalogo,
}: {
  perfil: PerfilTecnicoCompleto | null
  competenciasCatalogo: CompetenciaItem[]
}) {
  const [tab, setTab] = useState('formacion')

  const formaciones = perfil?.formaciones ?? []
  const experiencias = perfil?.experiencias ?? []
  const idiomas = perfil?.idiomas ?? []
  const competenciasActuales = perfil?.competencias ?? []

  return (
    <div>
      <Tabs items={TAB_ITEMS} value={tab} onChange={setTab} className="mb-6" />

      {tab === 'formacion' && <SeccionFormacion formaciones={formaciones} />}
      {tab === 'experiencia' && <SeccionExperiencia experiencias={experiencias} />}
      {tab === 'idiomas' && <SeccionIdiomas idiomas={idiomas} />}
      {tab === 'competencias' && (
        <SeccionCompetencias catalogo={competenciasCatalogo} actuales={competenciasActuales} />
      )}
    </div>
  )
}
