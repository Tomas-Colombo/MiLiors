'use client'

import { useState, useTransition } from 'react'
import { Card, Alert } from '@/components/ui'
import { Button } from '@/components/ui'
import { Textarea, Field } from '@/components/ui'
import { EditIcon, TrashIcon, PlusIcon } from '@/components/icons'
import { crearNota, editarNota, eliminarNota } from '@/modules/postulantes/actions'
import { NotaTexto } from '@/components/shared/nota-texto'

type Nota = {
  id: string
  contenido: string
  fecha_creacion: string
  updated_at: string
  puesto_id: string | null
  titulo_puesto: string | null
}

type Props = {
  postulanteId: string
  notasIniciales: Nota[]
}

export function NotasPanel({ postulanteId, notasIniciales }: Props) {
  // Local optimistic state — Server Actions with revalidatePath handle the source of truth
  const [notas, setNotas] = useState(notasIniciales)
  const [nuevaNota, setNuevaNota] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editContenido, setEditContenido] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCrear() {
    setError(null)
    if (!nuevaNota.trim()) return
    startTransition(async () => {
      const result = await crearNota(postulanteId, nuevaNota)
      if (!result.success) {
        setError(result.error)
        return
      }
      // Optimistic: add a temp note; revalidatePath will sync from server on next navigation
      setNotas((prev) => [
        {
          id: crypto.randomUUID(),
          contenido: nuevaNota.trim(),
          fecha_creacion: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          puesto_id: null,
          titulo_puesto: result.data.titulo_puesto,
        },
        ...prev,
      ])
      setNuevaNota('')
    })
  }

  function startEdit(nota: Nota) {
    setEditandoId(nota.id)
    setEditContenido(nota.contenido)
    setError(null)
  }

  function handleEditar(notaId: string) {
    setError(null)
    startTransition(async () => {
      const result = await editarNota(notaId, editContenido)
      if (!result.success) {
        setError(result.error)
        return
      }
      setNotas((prev) =>
        prev.map((n) =>
          n.id === notaId
            ? { ...n, contenido: editContenido.trim(), updated_at: new Date().toISOString() }
            : n
        )
      )
      setEditandoId(null)
    })
  }

  function handleEliminar(notaId: string) {
    setError(null)
    startTransition(async () => {
      const result = await eliminarNota(notaId, postulanteId)
      if (!result.success) {
        setError(result.error)
        return
      }
      setNotas((prev) => prev.filter((n) => n.id !== notaId))
    })
  }

  return (
    <Card>
      <h3 className="text-[15px] font-bold text-ink mb-4">Notas privadas</h3>

      {/* New note form */}
      <div className="space-y-2 mb-6">
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
          loading={isPending}
          onClick={handleCrear}
          disabled={!nuevaNota.trim()}
        >
          Guardar nota
        </Button>
      </div>

      {/* Notes list */}
      {notas.length === 0 ? (
        <p className="text-[13px] text-muted text-center py-4">
          Todavía no escribiste notas sobre este candidato.
        </p>
      ) : (
        <ul className="space-y-3">
          {notas.map((nota) => (
            <li key={nota.id} className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
              {editandoId === nota.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContenido}
                    onChange={(e) => setEditContenido(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      loading={isPending}
                      onClick={() => handleEditar(nota.id)}
                    >
                      Guardar
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditandoId(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <NotaTexto contenido={nota.contenido} />
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
                        disabled={isPending}
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
    </Card>
  )
}
