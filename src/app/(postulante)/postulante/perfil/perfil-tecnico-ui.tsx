'use client'

import { useActionState, useTransition, useState } from 'react'
import { Tabs, Field, Input, Textarea, Select, Alert, Chip, Button } from '@/components/ui'
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
      <Field label="Fecha de graduación" hint="Opcional — formato mes/año">
        <Input name="fecha_graduacion" type="month" />
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
      <Field label="Fecha de graduación">
        <Input name="fecha_graduacion" type="month" defaultValue={item.fecha_graduacion ?? ''} />
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
                <p className="text-[12px] text-neutral-400">{f.fecha_graduacion}</p>
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
          <Input name="fecha_inicio" type="month" status={state.success === false && state.fieldErrors?.fecha_inicio ? 'error' : 'default'} />
        </Field>
        <Field label="Fin" hint="Dejá vacío si es tu trabajo actual" error={state.success === false && state.fieldErrors?.fecha_fin?.[0]}>
          <Input name="fecha_fin" type="month" />
        </Field>
      </div>
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
          <Input name="fecha_inicio" type="month" defaultValue={item.fecha_inicio} status={state.success === false && state.fieldErrors?.fecha_inicio ? 'error' : 'default'} />
        </Field>
        <Field label="Fin" hint="Vacío = trabajo actual" error={state.success === false && state.fieldErrors?.fecha_fin?.[0]}>
          <Input name="fecha_fin" type="month" defaultValue={item.fecha_fin ?? ''} />
        </Field>
      </div>
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
                {e.fecha_inicio} – {e.fecha_fin ?? 'Actualidad'}
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
