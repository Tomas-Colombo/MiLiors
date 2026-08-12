'use client'

import { useTransition, useState } from 'react'
import { Alert, Skeleton, Card, Badge, Button } from '@/components/ui'
import { generarInforme } from '@/modules/informe/actions'
import type { InformeData, FeedbackInforme } from '@/modules/informe/queries'
import { InformeDisplay } from '@/modules/informe/informe-display'
import { ValoracionCompetenciaControl, FeedbackGlobalForm } from './informe-feedback'
import { competenciaKeyPorNombre } from '@/modules/informe/competencias'

type Props = {
  informe: InformeData | null
  /** null mientras no haya informe LISTO — no hay nada que valorar. */
  feedback?: FeedbackInforme | null
}

function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}

export function InformeVisor({ informe, feedback }: Props) {
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)

  function handleGenerar() {
    setActionError(null)
    startTransition(async () => {
      const result = await generarInforme()
      if (!result.success) setActionError(result.error)
    })
  }

  // ── LISTO ──────────────────────────────────────────────────────────────────
  if (informe?.estado_informe === 'LISTO' && informe.contenido_json) {
    const data = informe.contenido_json
    const desactualizado = informe.desactualizado

    return (
      <div className="space-y-5">
        {/* Aviso de desactualización */}
        {desactualizado && (
          <Alert tone="warning" title="Tu informe está desactualizado">
            Modificaste tu Eneagrama o tu Human Design. Actualizá el informe para reflejar los cambios.
            <div className="mt-3">
              <Button variant="primary" size="sm" loading={isPending} onClick={handleGenerar} disabled={isPending}>
                Actualizar informe
              </Button>
            </div>
          </Alert>
        )}
        {actionError && <Alert tone="error" title="No se pudo actualizar">{actionError}</Alert>}

        {/* Status + descarga */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge tone={desactualizado ? 'warning' : 'success'} dot>
              {desactualizado ? 'Desactualizado' : 'Generado'}
            </Badge>
            {informe.fecha_generacion && (
              <span className="text-xs text-muted">{formatFecha(informe.fecha_generacion)}</span>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={() => window.open('/api/informe/descargar', '_blank')}>
            Descargar informe de personalidad
          </Button>
        </div>

        {/* Encabezado */}
        <Card padding="lg">
          <h2 className="text-xl font-extrabold text-ink">{data.nombre}</h2>
          {data.subtitulo && <p className="mt-1 text-sm text-muted">{data.subtitulo}</p>}
        </Card>

        {/* Contenido estructurado */}
        <Card padding="lg">
          <InformeDisplay
            data={data}
            variant="full"
            renderCompetenciaExtra={
              feedback
                ? c => {
                    // Un informe viejo puede traer competencias que ya no están
                    // en el motor: sin key no hay dónde guardar la valoración.
                    const key = competenciaKeyPorNombre(c.nombre)
                    if (!key) return null
                    return <ValoracionCompetenciaControl nombre={c.nombre} inicial={feedback.competencias[key]} />
                  }
                : undefined
            }
          />
        </Card>

        {/* Cierre: una sola pregunta para el informe entero */}
        {feedback && <FeedbackGlobalForm inicial={feedback.global} />}

        <p className="text-right text-xs text-muted">
          Se marca como desactualizado al rehacer el Eneagrama o modificar el Human Design.
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
        {actionError && <Alert tone="error" title="Error en el reintento">{actionError}</Alert>}
        <Button variant="primary" loading={isPending} onClick={handleGenerar} disabled={isPending}>
          Reintentar
        </Button>
      </div>
    )
  }

  // ── Sin contenido visible: null / PENDIENTE / LISTO en formato viejo ─────────
  const estaGenerando = isPending
  // Informe LISTO pero sin contenido_json (heredado del formato anterior):
  // necesita generarse en el nuevo formato.
  const esFormatoViejo = !estaGenerando && informe?.estado_informe === 'LISTO'
  const quedoAtascado = !estaGenerando && informe?.estado_informe === 'PENDIENTE'

  return (
    <div className="space-y-4">
      <Card padding="lg">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            {estaGenerando ? (
              <Badge tone="info" dot>Generando...</Badge>
            ) : esFormatoViejo || quedoAtascado ? (
              <Badge tone="warning">{esFormatoViejo ? 'Formato anterior' : 'Pendiente'}</Badge>
            ) : (
              <Badge tone="neutral">Sin generar</Badge>
            )}
            {informe?.updated_at && (
              <span className="text-xs text-muted">Última actividad: {formatFecha(informe.updated_at)}</span>
            )}
          </div>

          <p className="text-sm text-muted">
            {estaGenerando
              ? 'Generando tu informe de personalidad. Puede tardar unos segundos.'
              : esFormatoViejo
              ? 'Tenés un informe de una versión anterior. Generalo de nuevo para verlo con el formato actual.'
              : quedoAtascado
              ? 'La generación quedó interrumpida. Podés volver a intentarlo.'
              : 'El informe se genera automáticamente al completar el Eneagrama.'}
          </p>

          {estaGenerando && (
            <div className="space-y-2 pt-1">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          )}
        </div>
      </Card>

      {actionError && <Alert tone="error" title="Error al generar">{actionError}</Alert>}

      {!estaGenerando && (
        <Button variant="primary" loading={isPending} onClick={handleGenerar} disabled={isPending}>
          {esFormatoViejo || quedoAtascado ? 'Generar informe' : 'Generar informe ahora'}
        </Button>
      )}
    </div>
  )
}
