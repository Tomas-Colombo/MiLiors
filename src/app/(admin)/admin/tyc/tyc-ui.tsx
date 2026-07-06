'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Button, Input, Textarea, Field, Alert, Badge } from '@/components/ui'
import { PlusIcon, FileIcon, ChevronDownIcon } from '@/components/icons'
import { publicarTyC } from '@/modules/admin/actions'
import { cn } from '@/lib/utils'
import type { ActionResult } from '@/lib/types/domain'

type Version = {
  id: string
  version: string
  descripcion: string
  fecha_publicacion: string
  fecha_baja_tyc: string | null
  aceptaciones: number
}

const initialState: ActionResult = { success: false, error: '' }

function fmtFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// ─── Contenedor con pestañas ──────────────────────────────────────────────────

export function TyCAdmin({ versiones }: { versiones: Version[] }) {
  const [tab, setTab] = useState<'publicar' | 'historial'>('publicar')

  return (
    <div>
      <div className="mt-6 flex gap-1 border-b border-neutral-200">
        <TabButton active={tab === 'publicar'} onClick={() => setTab('publicar')}>
          Publicar nueva versión
        </TabButton>
        <TabButton active={tab === 'historial'} onClick={() => setTab('historial')}>
          Historial ({versiones.length})
        </TabButton>
      </div>

      {tab === 'publicar' ? <PublicarTab /> : <HistorialTab versiones={versiones} />}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'cursor-pointer px-4 py-2.5 text-[13.5px] font-semibold transition-colors -mb-px border-b-2',
        active
          ? 'border-primary-600 text-primary-600'
          : 'border-transparent text-muted hover:text-ink'
      )}
    >
      {children}
    </button>
  )
}

// ─── Pestaña: publicar nueva versión ──────────────────────────────────────────

function PublicarTab() {
  const [state, action, pending] = useActionState(publicarTyC, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) formRef.current?.reset()
  }, [state])

  return (
    <div className="mt-6 space-y-5">
      <Alert tone="warning" title="Importante">
        Cada vez que publiques una nueva versión de los Términos y Condiciones, todos los usuarios
        (postulantes y reclutadores) verán un cartel al iniciar sesión y no podrán usar la aplicación
        hasta que los acepten.
      </Alert>

      {state.success && <Alert tone="success" title="Nueva versión publicada correctamente." />}
      {!state.success && state.error && <Alert tone="error" title={state.error} />}

      <form
        ref={formRef}
        action={action}
        className="space-y-4 rounded-xl border border-neutral-200 bg-surface p-6 shadow-card"
      >
        <Field label="Número de versión" htmlFor="version" hint="Ej: 2.0, 2.1…">
          <Input
            id="version"
            name="version"
            placeholder="2.0"
            required
            className="max-w-[180px]"
            status={!state.success && state.error ? 'error' : 'default'}
          />
        </Field>

        <Field label="Contenido de los Términos y Condiciones" htmlFor="descripcion">
          <Textarea
            id="descripcion"
            name="descripcion"
            rows={14}
            required
            placeholder="Escribí el texto completo de los Términos y Condiciones…"
          />
        </Field>

        <Button type="submit" loading={pending} leftIcon={<PlusIcon size={15} />}>
          Publicar nueva versión
        </Button>
      </form>
    </div>
  )
}

// ─── Pestaña: historial de versiones ──────────────────────────────────────────

function HistorialTab({ versiones }: { versiones: Version[] }) {
  const [expandida, setExpandida] = useState<string | null>(null)

  if (versiones.length === 0) {
    return (
      <p className="mt-6 text-sm text-muted">Todavía no se publicó ninguna versión de Términos y Condiciones.</p>
    )
  }

  return (
    <div className="mt-6 space-y-3">
      {versiones.map(v => {
        const vigente = !v.fecha_baja_tyc
        const abierta = expandida === v.id
        return (
          <div key={v.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-surface shadow-card">
            <button
              type="button"
              onClick={() => setExpandida(abierta ? null : v.id)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left"
            >
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-primary-tint text-primary-600">
                <FileIcon size={18} />
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-bold text-ink">Versión {v.version}</span>
                  {vigente ? (
                    <Badge tone="success" dot>Vigente</Badge>
                  ) : (
                    <Badge tone="neutral" dot>Histórica</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-[12px] text-muted">
                  Publicada el {fmtFecha(v.fecha_publicacion)}
                  {v.fecha_baja_tyc && ` · Reemplazada el ${fmtFecha(v.fecha_baja_tyc)}`}
                  {` · ${v.aceptaciones} ${v.aceptaciones === 1 ? 'aceptación' : 'aceptaciones'}`}
                </p>
              </div>
              <ChevronDownIcon
                size={16}
                className={cn('flex-none text-neutral-400 transition-transform', abierta && 'rotate-180')}
              />
            </button>

            {abierta && (
              <div className="border-t border-neutral-100 px-5 py-4">
                <div className="max-h-[40vh] overflow-y-auto whitespace-pre-wrap text-[13px] leading-relaxed text-soft">
                  {v.descripcion}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
