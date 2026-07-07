'use client'

import { useActionState, useTransition, useState, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Button, Switch, Modal, Input, Field, Alert } from '@/components/ui'
import { EditIcon, TrashIcon, PlusIcon } from '@/components/icons'
import {
  editarPregunta,
  eliminarPregunta,
  togglePausarPregunta,
} from '@/modules/admin/actions'
import type { ActionResult } from '@/lib/types/domain'

type Pregunta = {
  id: string
  numero_pregunta: number
  enunciado: string
  eneatipo_asociado: number
  fecha_baja: string | null
  pausada: boolean
}

const initialState: ActionResult = { success: false, error: '' }

// ─── Switch de activa/pausada ─────────────────────────────────────────────────

export function PausaSwitch({ id, pausada }: { id: string; pausada: boolean }) {
  const [isPending, startTransition] = useTransition()

  function handleChange(checked: boolean) {
    // checked=true → activa (pausada=false) | checked=false → pausada (pausada=true)
    startTransition(async () => {
      await togglePausarPregunta(id, !checked)
    })
  }

  return (
    <Switch
      checked={!pausada}
      onCheckedChange={handleChange}
      disabled={isPending}
    />
  )
}

// ─── Modal de confirmación de eliminación ─────────────────────────────────────

export function EliminarPreguntaBtn({ id, enunciado }: { id: string; enunciado: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleConfirmar() {
    startTransition(async () => {
      await eliminarPregunta(id)
      setOpen(false)
    })
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-error hover:bg-error-bg hover:text-error"
        aria-label="Eliminar pregunta"
      >
        <TrashIcon size={15} />
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="¿Eliminar esta pregunta?"
        width={460}
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => setOpen(false)} className="flex-1">
              Cancelar
            </Button>
            <Button
              size="md"
              onClick={handleConfirmar}
              loading={isPending}
              className="flex-1 bg-error text-white hover:bg-red-700"
            >
              Eliminar
            </Button>
          </>
        }
      >
        <p className="mt-2 line-clamp-3 rounded-lg bg-neutral-50 px-4 py-3 text-[13px] italic text-ink-soft">
          &ldquo;{enunciado}&rdquo;
        </p>
        <p className="mt-3 text-[12.5px] text-muted">
          La pregunta pasará a la sección de eliminadas. No se borra de la base de datos.
        </p>
      </Modal>
    </>
  )
}

// ─── Modal de edición ─────────────────────────────────────────────────────────

function EditarModal({ pregunta, onClose }: { pregunta: Pregunta; onClose: () => void }) {
  const [state, action, pending] = useActionState(editarPregunta, initialState)

  useEffect(() => {
    if (state.success) onClose()
  }, [state.success, onClose])

  return (
    <Modal
      open
      onClose={onClose}
      title={`Editar pregunta #${String(pregunta.numero_pregunta).padStart(3, '0')}`}
      width={520}
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" form="form-editar-pregunta" size="md" loading={pending} className="flex-1">
            Guardar cambios
          </Button>
        </>
      }
    >
      <form id="form-editar-pregunta" action={action} className="mt-4 flex flex-col gap-4">
        <input type="hidden" name="id" value={pregunta.id} />

        <Field label="Eneatipo (1–9)" htmlFor="eneatipo_asociado">
          <Input
            id="eneatipo_asociado"
            name="eneatipo_asociado"
            type="number"
            min={1}
            max={9}
            defaultValue={pregunta.eneatipo_asociado}
            required
          />
        </Field>

        <Field label="Enunciado" htmlFor="enunciado">
          <textarea
            id="enunciado"
            name="enunciado"
            defaultValue={pregunta.enunciado}
            required
            rows={4}
            className="w-full resize-none rounded-lg border border-[#c9cdd4] bg-surface px-3 py-2 text-[13.5px] text-ink outline-none transition-colors placeholder:text-neutral-400 focus:border-primary-400 focus:ring-[3px] focus:ring-primary-50"
          />
        </Field>

        {state && !state.success && state.error && (
          <Alert tone="error" title={state.error} />
        )}
      </form>
    </Modal>
  )
}

export function EditarPreguntaBtn({ pregunta }: { pregunta: Pregunta }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} aria-label="Editar pregunta">
        <EditIcon size={15} />
      </Button>
      {open && <EditarModal pregunta={pregunta} onClose={() => setOpen(false)} />}
    </>
  )
}

// ─── Modal de creación ────────────────────────────────────────────────────────

function CrearModal({ onClose }: { onClose: () => void }) {
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setPending(true)

    const form = e.currentTarget
    const enunciado = (form.elements.namedItem('enunciado') as HTMLTextAreaElement).value.trim()
    const eneatipo_asociado = Number(
      (form.elements.namedItem('eneatipo_asociado') as HTMLInputElement).value
    )

    try {
      const res = await fetch('/api/admin/preguntas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enunciado, eneatipo_asociado }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'No se pudo crear la pregunta.')
        return
      }
      router.refresh()
      onClose()
    } catch {
      setError('Error de red. Intentá de nuevo.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Nueva pregunta"
      width={520}
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button type="submit" form="form-crear-pregunta" size="md" loading={pending} className="flex-1">
            Crear pregunta
          </Button>
        </>
      }
    >
      <form id="form-crear-pregunta" onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <Field label="Eneatipo (1–9)" htmlFor="eneatipo_asociado_nuevo">
          <Input
            id="eneatipo_asociado_nuevo"
            name="eneatipo_asociado"
            type="number"
            min={1}
            max={9}
            placeholder="Ej: 3"
            required
          />
        </Field>

        <Field label="Enunciado" htmlFor="enunciado_nuevo">
          <textarea
            id="enunciado_nuevo"
            name="enunciado"
            required
            rows={4}
            placeholder="Escribí el enunciado de la pregunta…"
            className="w-full resize-none rounded-lg border border-[#c9cdd4] bg-surface px-3 py-2 text-[13.5px] text-ink outline-none transition-colors placeholder:text-neutral-400 focus:border-primary-400 focus:ring-[3px] focus:ring-primary-50"
          />
        </Field>

        {error && <Alert tone="error" title={error} />}
      </form>
    </Modal>
  )
}

export function CrearPreguntaBtn() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button size="md" leftIcon={<PlusIcon size={15} />} onClick={() => setOpen(true)}>
        Nueva pregunta
      </Button>
      {open && <CrearModal onClose={() => setOpen(false)} />}
    </>
  )
}

// ─── Filtro activas / pausadas ────────────────────────────────────────────────

type Filtro = 'todas' | 'activas' | 'pausadas' | 'eliminadas'

const FILTROS: { value: Filtro; label: string; dot: string }[] = [
  { value: 'todas',      label: 'Todas',      dot: 'bg-neutral-300' },
  { value: 'activas',    label: 'Activas',    dot: 'bg-primary-600' },
  { value: 'pausadas',   label: 'Pausadas',   dot: 'bg-neutral-400' },
  { value: 'eliminadas', label: 'Eliminadas', dot: 'bg-error' },
]

export function FiltroPreguntas({ filtroActual }: { filtroActual: Filtro }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleSelect(value: Filtro) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === 'todas') {
      params.delete('filtro')
    } else {
      params.set('filtro', value)
    }
    // Cambiar de filtro vuelve a la primera página
    params.delete('page')
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 bg-surface p-1 shadow-card">
      {FILTROS.map(f => {
        const active = f.value === filtroActual
        return (
          <button
            key={f.value}
            type="button"
            onClick={() => handleSelect(f.value)}
            className={`inline-flex items-center gap-2 rounded-[9px] px-3.5 py-1.5 text-[13px] font-medium transition-all ${
              active
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-ink-soft hover:bg-neutral-50 hover:text-ink'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${active ? 'bg-white/70' : f.dot}`} />
            {f.label}
          </button>
        )
      })}
    </div>
  )
}
