'use client'

import { useState, useTransition, type ButtonHTMLAttributes } from 'react'
import { Button, Textarea, Field, Alert, Skeleton } from '@/components/ui'
import { EditIcon, TrashIcon, PlusIcon } from '@/components/icons'
import { crearNota, editarNota, eliminarNota, type NotaData } from '@/modules/postulantes/actions'
import { MAX_NOTA } from '@/modules/postulantes/schema'
import { NotaTexto } from '@/components/shared/nota-texto'
import { formatFecha } from '@/lib/fecha'

export type NotaIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tono: 'neutral' | 'peligro'
}

export function NotaIconButton({
  tono,
  className = '',
  children,
  ...props
}: NotaIconButtonProps) {
  const tonoClases =
    tono === 'peligro'
      ? 'hover:text-error-ink hover:bg-error-bg'
      : 'hover:text-ink hover:bg-neutral-200'

  return (
    <button
      type="button"
      className={`p-1.5 rounded-md text-muted ${tonoClases} transition-colors disabled:opacity-50 ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  )
}

export type NotasCandidatoProps = {
  postulanteId: string
  puestoId?: string | null
  notas: NotaData[] | null
  onNotasChange: (actualizar: (previas: NotaData[]) => NotaData[]) => void
  cargando?: boolean
  errorCarga?: string | null
  listaClassName: string
}

export function NotasCandidato({
  postulanteId,
  puestoId,
  notas,
  onNotasChange,
  cargando,
  errorCarga,
  listaClassName,
}: NotasCandidatoProps) {
  const [nuevaNota, setNuevaNota] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editContenido, setEditContenido] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [guardando, startGuardado] = useTransition()

  function handleCrear() {
    setError(null)
    const trimmed = nuevaNota.trim()
    if (!trimmed) return
    startGuardado(async () => {
      const result = await crearNota(postulanteId, nuevaNota, puestoId ?? undefined)
      if (!result.success) {
        setError(result.error)
        return
      }
      onNotasChange((prev) => [
        {
          id: crypto.randomUUID(),
          contenido: trimmed,
          fecha_creacion: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          puesto_id: puestoId ?? null,
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
      onNotasChange((prev) =>
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
      onNotasChange((prev) => (prev ?? []).filter((n) => n.id !== notaId))
    })
  }

  return (
    <div className="space-y-4">
      {/* New note form */}
      <div className="space-y-2">
        <Field label="Nueva nota">
          <Textarea
            value={nuevaNota}
            onChange={(e) => setNuevaNota(e.target.value)}
            placeholder="Escribí tus observaciones sobre este candidato…"
            rows={3}
            maxLength={MAX_NOTA}
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

      {errorCarga && <Alert tone="error">{errorCarga}</Alert>}

      {/* Notes list */}
      {cargando ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : notas && notas.length === 0 ? (
        <p className="text-compact text-muted text-center py-4">
          Todavía no escribiste notas sobre este candidato.
        </p>
      ) : (
        <ul className={`space-y-3 overflow-y-auto pr-1 ${listaClassName}`}>
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
                    maxLength={MAX_NOTA}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      loading={guardando}
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
                    <div className="text-2xs text-neutral-400">
                      {nota.titulo_puesto && (
                        <span className="mr-2">📌 {nota.titulo_puesto}</span>
                      )}
                      {formatFecha(nota.updated_at, 'abreviada')}
                    </div>
                    <div className="flex gap-1">
                      <NotaIconButton
                        tono="neutral"
                        onClick={() => startEdit(nota)}
                        aria-label="Editar nota"
                      >
                        <EditIcon size={14} />
                      </NotaIconButton>
                      <NotaIconButton
                        tono="peligro"
                        onClick={() => handleEliminar(nota.id)}
                        disabled={guardando}
                        aria-label="Eliminar nota"
                      >
                        <TrashIcon size={14} />
                      </NotaIconButton>
                    </div>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
