'use client'

import { useState, useTransition } from 'react'
import { Modal, Button, Textarea, Field, Alert, Skeleton } from '@/components/ui'
import { EditIcon, TrashIcon, PlusIcon, FileTextIcon } from '@/components/icons'
import {
  getNotasDePostulante,
  crearNota,
  editarNota,
  eliminarNota,
  type NotaData,
} from '@/modules/postulantes/actions'

type Props = {
  postulanteId: string
  puestoId: string | null
  nombrePostulante?: string | null
}

export function NotasModalBtn({ postulanteId, puestoId, nombrePostulante }: Props) {
  const [open, setOpen] = useState(false)
  const [notas, setNotas] = useState<NotaData[] | null>(null)
  const [nuevaNota, setNuevaNota] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editContenido, setEditContenido] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cargando, startCarga] = useTransition()
  const [guardando, startGuardado] = useTransition()

  function handleOpen() {
    setOpen(true)
    setError(null)
    // Fetch notes lazily the first time the modal opens.
    if (notas !== null || cargando) return
    startCarga(async () => {
      const result = await getNotasDePostulante(postulanteId)
      if (result.success) setNotas(result.data)
      else setError(result.error)
    })
  }

  function handleCrear() {
    setError(null)
    if (!nuevaNota.trim()) return
    startGuardado(async () => {
      const result = await crearNota(postulanteId, nuevaNota, puestoId ?? undefined)
      if (!result.success) {
        setError(result.error)
        return
      }
      // Optimistic prepend; server state syncs on next navigation via revalidatePath.
      setNotas((prev) => [
        {
          id: crypto.randomUUID(),
          contenido: nuevaNota.trim(),
          fecha_creacion: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          puesto_id: puestoId,
          titulo_puesto: result.data.titulo_puesto,
        },
        ...(prev ?? []),
      ])
      setNuevaNota('')
    })
  }

  function startEdit(nota: NotaData) {
    setEditandoId(nota.id)
    setEditContenido(nota.contenido)
    setError(null)
  }

  function handleEditar(notaId: string) {
    setError(null)
    startGuardado(async () => {
      const result = await editarNota(notaId, editContenido)
      if (!result.success) {
        setError(result.error)
        return
      }
      setNotas((prev) =>
        (prev ?? []).map((n) =>
          n.id === notaId
            ? { ...n, contenido: editContenido.trim(), updated_at: new Date().toISOString() }
            : n,
        ),
      )
      setEditandoId(null)
    })
  }

  function handleEliminar(notaId: string) {
    setError(null)
    startGuardado(async () => {
      const result = await eliminarNota(notaId, postulanteId)
      if (!result.success) {
        setError(result.error)
        return
      }
      setNotas((prev) => (prev ?? []).filter((n) => n.id !== notaId))
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary-tint px-3 h-8 text-[12.5px] font-semibold text-primary-600 hover:bg-primary-tint-hover transition-colors whitespace-nowrap"
      >
        <FileTextIcon size={14} />
        Notas
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Notas privadas" width={560}>
        <div className="space-y-4">
          {nombrePostulante && (
            <p className="text-[13px] text-muted">
              Notas sobre <span className="font-semibold text-ink-soft">{nombrePostulante}</span>
            </p>
          )}

          {/* New note form */}
          <div className="space-y-2">
            <Field label="Nueva nota">
              <Textarea
                value={nuevaNota}
                onChange={(e) => setNuevaNota(e.target.value)}
                placeholder="Escribí tus observaciones sobre este candidato…"
                rows={3}
              />
            </Field>
            {error && <Alert tone="error">{error}</Alert>}
            <Button
              size="sm"
              variant="tonal"
              leftIcon={<PlusIcon size={14} />}
              loading={guardando}
              onClick={handleCrear}
              disabled={!nuevaNota.trim()}
            >
              Guardar nota
            </Button>
          </div>

          {/* Notes list */}
          {cargando ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : notas && notas.length === 0 ? (
            <p className="text-[13px] text-muted text-center py-4">
              Todavía no escribiste notas sobre este candidato.
            </p>
          ) : (
            <ul className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {notas?.map((nota) => (
                <li
                  key={nota.id}
                  className="rounded-lg border border-neutral-200 bg-neutral-50 p-4"
                >
                  {editandoId === nota.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContenido}
                        onChange={(e) => setEditContenido(e.target.value)}
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" loading={guardando} onClick={() => handleEditar(nota.id)}>
                          Guardar
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditandoId(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-[13px] text-ink whitespace-pre-wrap">{nota.contenido}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="text-[11.5px] text-neutral-400">
                          {nota.titulo_puesto && (
                            <span className="mr-2">📌 {nota.titulo_puesto}</span>
                          )}
                          {new Date(nota.updated_at).toLocaleDateString('es-AR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(nota)}
                            className="p-1.5 rounded-md text-muted hover:text-ink hover:bg-neutral-200 transition-colors"
                            aria-label="Editar nota"
                          >
                            <EditIcon size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEliminar(nota.id)}
                            disabled={guardando}
                            className="p-1.5 rounded-md text-muted hover:text-error hover:bg-error-bg transition-colors disabled:opacity-50"
                            aria-label="Eliminar nota"
                          >
                            <TrashIcon size={14} />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </>
  )
}
