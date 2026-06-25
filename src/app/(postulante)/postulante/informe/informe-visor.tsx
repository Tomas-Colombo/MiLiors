'use client'

import { useTransition, useState } from 'react'
import { Alert, Skeleton, Card, Badge, Button } from '@/components/ui'
import { generarInforme } from '@/modules/informe/actions'
import type { InformeData } from '@/modules/informe/queries'
import { INFORME_SECTION_LABELS, INFORME_SECTION_ORDER } from '@/lib/types/informe'

type Props = {
  informe: InformeData | null
}

function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function InformeVisor({ informe }: Props) {
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)

  function handleGenerar() {
    setActionError(null)
    startTransition(async () => {
      const result = await generarInforme()
      if (!result.success) {
        setActionError(result.error)
      }
    })
  }

  // ── LISTO ──────────────────────────────────────────────────────────────────
  if (informe?.estado_informe === 'LISTO') {
    return (
      <div className="space-y-4">
        {/* Status row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge tone="success" dot>Generado</Badge>
            {informe.desactualizado && (
              <Badge tone="warning">Desactualizado</Badge>
            )}
          </div>
          {informe.fecha_generacion && (
            <span className="text-xs text-muted">
              {formatFecha(informe.fecha_generacion)}
            </span>
          )}
        </div>

        {/* Desactualizado banner */}
        {informe.desactualizado && (
          <Alert tone="warning" title="Informe desactualizado">
            Guardaste nuevos datos de personalidad. Regenerá el informe para que refleje los cambios.
          </Alert>
        )}

        {/* Structured content — use contenido_json if available, fallback to text */}
        {informe.contenido_json ? (
          <div className="space-y-4">
            {INFORME_SECTION_ORDER.map((key) => {
              const text = informe.contenido_json![key]
              if (!text) return null
              return (
                <Card key={key} padding="lg">
                  <h2 className="mb-3 text-[11px] font-bold uppercase tracking-widest text-primary-600">
                    {INFORME_SECTION_LABELS[key]}
                  </h2>
                  <div className="space-y-2 text-[14px] leading-relaxed text-ink">
                    {text.split(/\n\n+/).filter(Boolean).map((p, i) => (
                      <p key={i}>{p.trim()}</p>
                    ))}
                  </div>
                </Card>
              )
            })}
          </div>
        ) : informe.contenido_informe ? (
          <Card padding="lg">
            <div className="space-y-4 text-[14.5px] leading-relaxed text-ink">
              {informe.contenido_informe.split(/\n\n+/).filter(Boolean).map((p, i) => (
                <p key={i}>{p.trim()}</p>
              ))}
            </div>
          </Card>
        ) : null}

        {/* Regenerate */}
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" loading={isPending} onClick={handleGenerar} disabled={isPending}>
            {informe.desactualizado ? 'Actualizar informe' : 'Regenerar informe'}
          </Button>
        </div>

        {actionError && (
          <Alert tone="error" title="Error al regenerar">{actionError}</Alert>
        )}
      </div>
    )
  }

  // ── ERROR ──────────────────────────────────────────────────────────────────
  if (informe?.estado_informe === 'ERROR') {
    return (
      <div className="space-y-4">
        <Alert tone="error" title="No se pudo generar el informe">
          Hubo un problema al generar tu informe de personalidad. Podés reintentarlo ahora.
        </Alert>
        {actionError && (
          <Alert tone="error" title="Error en el reintento">{actionError}</Alert>
        )}
        <Button variant="primary" loading={isPending} onClick={handleGenerar} disabled={isPending}>
          Reintentar
        </Button>
      </div>
    )
  }

  // ── PENDIENTE / null ───────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <Card padding="lg">
        <div className="space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </Card>
      <p className="text-sm text-muted">
        {informe?.estado_informe === 'PENDIENTE' ? 'Generando tu informe...' : 'Tu informe aún no fue generado.'}
      </p>
      {actionError && (
        <Alert tone="error" title="Error al generar">{actionError}</Alert>
      )}
      <Button variant="primary" loading={isPending} onClick={handleGenerar} disabled={isPending}>
        Generar ahora
      </Button>
    </div>
  )
}
