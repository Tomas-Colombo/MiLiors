'use client'

import { useTransition, useState } from 'react'
import { Alert, Skeleton, Card, Badge, Button } from '@/components/ui'
import { generarInforme } from '@/modules/informe/actions'
import type { InformeData } from '@/modules/informe/queries'

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
      // On success, revalidatePath in the server action refreshes the Server Component
    })
  }

  // ── LISTO ──────────────────────────────────────────────────────────────────
  if (informe?.estado_informe === 'LISTO' && informe.contenido_informe) {
    const parrafos = informe.contenido_informe.split(/\n\n+/).filter(Boolean)

    return (
      <div className="space-y-4">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <Badge tone="success" dot>
            Generado
          </Badge>
          {informe.fecha_generacion && (
            <span className="text-xs text-muted">
              {formatFecha(informe.fecha_generacion)}
            </span>
          )}
        </div>

        {/* Report body */}
        <Card padding="lg">
          <div className="space-y-4 text-[14.5px] leading-relaxed text-ink">
            {parrafos.map((parrafo, idx) => (
              <p key={idx}>{parrafo.trim()}</p>
            ))}
          </div>
        </Card>

        {/* Regenerate option */}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            loading={isPending}
            onClick={handleGenerar}
            disabled={isPending}
          >
            Regenerar informe
          </Button>
        </div>

        {actionError && (
          <Alert tone="error" title="Error al regenerar">
            {actionError}
          </Alert>
        )}
      </div>
    )
  }

  // ── ERROR ──────────────────────────────────────────────────────────────────
  if (informe?.estado_informe === 'ERROR') {
    return (
      <div className="space-y-4">
        <Alert tone="error" title="No se pudo generar el informe">
          Hubo un problema al generar tu informe de personalidad. Podés
          reintentarlo ahora.
        </Alert>

        {actionError && (
          <Alert tone="error" title="Error en el reintento">
            {actionError}
          </Alert>
        )}

        <Button
          variant="primary"
          loading={isPending}
          onClick={handleGenerar}
          disabled={isPending}
        >
          Reintentar
        </Button>
      </div>
    )
  }

  // ── PENDIENTE / null (no existe aún) ───────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Skeleton loader */}
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
        {informe?.estado_informe === 'PENDIENTE'
          ? 'Generando tu informe...'
          : 'Tu informe aún no fue generado.'}
      </p>

      {actionError && (
        <Alert tone="error" title="Error al generar">
          {actionError}
        </Alert>
      )}

      <Button
        variant="primary"
        loading={isPending}
        onClick={handleGenerar}
        disabled={isPending}
      >
        Generar ahora
      </Button>
    </div>
  )
}
