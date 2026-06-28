'use client'

import { useActionState, useTransition, useState, useRef } from 'react'
import { Tabs, Field, Input, Textarea, Select, Alert, Chip, Button } from '@/components/ui'
import type { InputProps } from '@/components/ui/input'
import { CalendarIcon } from '@/components/icons'
import { NIVEL_IDIOMA_LABEL, UNIVERSIDADES_ARGENTINA, IDIOMAS_COMUNES } from '@/lib/constants/enums'
import {
  agregarFormacion,
  editarFormacion,
  eliminarFormacion,
  agregarExperiencia,
  editarExperiencia,
  eliminarExperiencia,
  agregarIdioma,
  eliminarIdioma,
  guardarCompetenciasConCustom,
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

// ─── SELECT OPTIONS ───────────────────────────────────────────────────────────
const nivelIdiomaOptions = Object.entries(NIVEL_IDIOMA_LABEL).map(([value, label]) => ({ value, label }))
const universidadOptions = UNIVERSIDADES_ARGENTINA.map((u) => ({ value: u, label: u }))
const idiomaOptions = IDIOMAS_COMUNES.map((i) => ({ value: i, label: i }))

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
        <Select name="institucion" options={universidadOptions} placeholder="Seleccioná la institución" />
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
        <Select name="institucion" options={universidadOptions} placeholder="Seleccioná la institución" defaultValue={item.institucion} />
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
          <Select name="nombre" options={idiomaOptions} placeholder="Seleccioná un idioma" />
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

/**
 * Represents a competency in the selection state.
 * Items from the catalog have a real UUID. Custom items use a temp key
 * (prefixed "custom:") until they are persisted — after saving, the server
 * returns the real IDs and the state is reconciled.
 */
type SeleccionItem = { id: string; nombre: string; isCustom?: boolean }

function SeccionCompetencias({
  catalogo,
  actuales,
}: {
  catalogo: CompetenciaItem[]
  actuales: CompetenciaItem[]
}) {
  const [seleccionadas, setSeleccionadas] = useState<SeleccionItem[]>(
    actuales.map((c) => ({ id: c.id, nombre: c.nombre }))
  )
  const [query, setQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const MAX = 15
  const total = seleccionadas.length

  // Catalog items filtered by query, excluding already selected ones
  const queryTrimmed = query.trim()
  const filtradas = catalogo.filter((c) => {
    const alreadySelected = seleccionadas.some((s) => s.id === c.id)
    if (alreadySelected) return false
    if (!queryTrimmed) return true
    return c.nombre.toLowerCase().includes(queryTrimmed.toLowerCase())
  })

  // Whether the typed text exactly matches a catalog item (case-insensitive)
  const exactMatch = queryTrimmed
    ? catalogo.some((c) => c.nombre.toLowerCase() === queryTrimmed.toLowerCase())
    : false

  // Whether to show the "+ Agregar" custom option
  const canAddCustom =
    queryTrimmed.length >= 2 &&
    !exactMatch &&
    !seleccionadas.some((s) => s.nombre.toLowerCase() === queryTrimmed.toLowerCase())

  function addItem(item: SeleccionItem) {
    if (total >= MAX) return
    setSeleccionadas((prev) => [...prev, item])
    setQuery('')
    inputRef.current?.focus()
  }

  function removeItem(id: string) {
    setSeleccionadas((prev) => prev.filter((s) => s.id !== id))
    setFeedback(null)
  }

  function clearAll() {
    setSeleccionadas([])
    setFeedback(null)
  }

  function addFromCatalog(c: CompetenciaItem) {
    addItem({ id: c.id, nombre: c.nombre })
  }

  function addCustom() {
    if (!canAddCustom) return
    addItem({ id: `custom:${queryTrimmed}`, nombre: queryTrimmed, isCustom: true })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (filtradas.length === 1 && !canAddCustom) {
        addFromCatalog(filtradas[0])
      } else if (canAddCustom) {
        addCustom()
      }
    }
  }

  function handleGuardar() {
    const existingIds = seleccionadas.filter((s) => !s.isCustom).map((s) => s.id)
    const customNames = seleccionadas.filter((s) => s.isCustom).map((s) => s.nombre)
    setFeedback(null)
    startTransition(async () => {
      const result = await guardarCompetenciasConCustom(existingIds, customNames)
      if (result.success) {
        // Reconcile custom temp-keys with real IDs returned by the server
        if (result.items && result.items.length > 0) {
          setSeleccionadas(result.items.map((i) => ({ id: i.id, nombre: i.nombre })))
        }
        setFeedback({ ok: true, msg: 'Competencias guardadas.' })
      } else {
        setFeedback({ ok: false, msg: result.error ?? 'Error al guardar.' })
      }
    })
  }

  const progressPct = Math.round((total / MAX) * 100)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-bold text-ink">Competencias</h2>
          <p className="text-[13px] text-muted">Seleccioná hasta {MAX} competencias del catálogo, o agregá las tuyas.</p>
        </div>
        <span className="shrink-0 rounded-full bg-primary-ghost-hover px-3 py-1 text-[12px] font-semibold text-primary-600">
          {total}/{MAX} seleccionadas
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full rounded-full bg-primary-600 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Selection zone */}
      <div className="rounded-xl border border-neutral-200 bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted">Tu selección</span>
          {seleccionadas.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="text-[12px] font-medium text-primary-600 hover:underline"
            >
              Limpiar todo
            </button>
          )}
        </div>
        {seleccionadas.length === 0 ? (
          <p className="text-[13px] text-neutral-400">Todavía no seleccionaste ninguna competencia.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {seleccionadas.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => removeItem(s.id)}
                className="flex items-center gap-1.5 rounded-full bg-primary-600 px-3 py-1 text-[13px] font-medium text-white transition-opacity hover:opacity-80"
              >
                {s.nombre}
                <span className="text-[11px] leading-none opacity-80">×</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search + custom input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setFeedback(null) }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar o escribir una competencia…"
            disabled={total >= MAX}
            className="h-10 w-full rounded-md border border-neutral-300 bg-surface pl-9 pr-4 text-sm text-ink placeholder:text-neutral-400 outline-none transition-[border,box-shadow] focus:border-[1.5px] focus:border-primary-600 focus:ring-[3px] focus:ring-primary-50 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400"
          />
        </div>
        {canAddCustom && (
          <button
            type="button"
            onClick={addCustom}
            disabled={total >= MAX}
            className="shrink-0 rounded-md bg-ink px-4 text-[13px] font-semibold text-white hover:bg-ink/85 disabled:opacity-40 transition-opacity"
          >
            + Agregar &ldquo;{queryTrimmed}&rdquo;
          </button>
        )}
      </div>

      {/* Catalog dropdown / empty state */}
      {queryTrimmed ? (
        filtradas.length > 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-surface p-2">
            <div className="flex flex-wrap gap-1.5 p-1">
              {filtradas.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => addFromCatalog(c)}
                  disabled={total >= MAX}
                  className="cursor-pointer disabled:opacity-40"
                >
                  <Chip selected={false}>{c.nombre}</Chip>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-4 py-5 text-center text-[13px] text-muted">
            No hay competencias que coincidan con &ldquo;<strong>{queryTrimmed}</strong>&rdquo;.{' '}
            {canAddCustom && (
              <>Presioná Enter o tocá <strong>Agregar</strong> para crearla.</>
            )}
          </div>
        )
      ) : (
        /* Show full catalog when not searching */
        <div className="flex flex-wrap gap-2">
          {catalogo.map((c) => {
            const selected = seleccionadas.some((s) => s.id === c.id)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => !selected && addFromCatalog(c)}
                disabled={(!selected && total >= MAX) || selected}
                className="cursor-pointer disabled:opacity-40"
              >
                <Chip selected={selected}>{c.nombre}</Chip>
              </button>
            )
          })}
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <Alert tone={feedback.ok ? 'success' : 'error'}>{feedback.msg}</Alert>
      )}

      {/* Save button */}
      <Button type="button" onClick={handleGuardar} disabled={isPending}>
        {isPending ? 'Guardando…' : 'Guardar selección'}
      </Button>
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
