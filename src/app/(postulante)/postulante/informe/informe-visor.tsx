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

  function handleReintentar() {
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
    let contenidoJSON: Record<string, string> | null = null
    try {
      if (informe.contenido_informe) {
        const parsed = JSON.parse(informe.contenido_informe)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          contenidoJSON = parsed as Record<string, string>
        }
      }
    } catch {
      // not JSON — will fall back to plain text
    }

    return (
      <div className="space-y-4">
        {/* Status row */}
        <div className="flex items-center justify-between">
          <Badge tone="success" dot>Generado</Badge>
          {informe.fecha_generacion && (
            <span className="text-xs text-muted">
              {formatFecha(informe.fecha_generacion)}
            </span>
          )}
        </div>

        {/* Structured sections if parseable, otherwise plain text */}
        {contenidoJSON ? (
          <div className="space-y-4">
            {INFORME_SECTION_ORDER.map((key) => {
              const text = contenidoJSON![key]
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

        <p className="text-xs text-muted text-right">
          Se actualiza automáticamente al rehacer el Eneagrama o al modificar el Human Design.
        </p>
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
        <Button variant="primary" loading={isPending} onClick={handleReintentar} disabled={isPending}>
          Reintentar
        </Button>
      </div>
    )
  }

  // ── PENDIENTE / null ───────────────────────────────────────────────────────
  const estaGenerando = isPending
  const quedoAtascado = !isPending && informe?.estado_informe === 'PENDIENTE'

  return (
    <div className="space-y-4">
      <Card padding="lg">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {estaGenerando ? (
                <Badge tone="info" dot>Generando...</Badge>
              ) : quedoAtascado ? (
                <Badge tone="warning">Pendiente</Badge>
              ) : (
                <Badge tone="neutral">Sin generar</Badge>
              )}
            </div>
            {informe?.updated_at && (
              <span className="text-xs text-muted">
                Última actividad: {formatFecha(informe.updated_at)}
              </span>
            )}
          </div>

          <p className="text-sm text-muted">
            {estaGenerando
              ? 'Generando tu informe de personalidad con el modelo de IA. Puede tardar unos minutos.'
              : quedoAtascado
              ? 'La generación quedó interrumpida. Podés volver a intentarlo.'
              : 'El informe se genera automáticamente al completar el Eneagrama o al guardar el Human Design.'}
          </p>

          {estaGenerando && (
            <div className="space-y-2 pt-1">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          )}
        </div>
      </Card>

      {actionError && (
        <Alert tone="error" title="Error al generar">{actionError}</Alert>
      )}

      {quedoAtascado && (
        <Button variant="primary" loading={isPending} onClick={handleReintentar} disabled={isPending}>
          Reintentar generación
        </Button>
      )}
    </div>
  )
}
