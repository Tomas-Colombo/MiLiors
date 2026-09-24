'use client'

import { useTransition, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Alert, Skeleton, Card, Badge, Button } from '@/components/ui'
import { generarInforme } from '@/modules/informe/actions'
import type { InformeData, FeedbackInforme } from '@/modules/informe/queries'
import { InformePapel } from '@/modules/informe/informe-papel'
import { FeedbackGlobalForm, ReconocimientoSeccionControl } from './informe-feedback'

type Props = {
  informe: InformeData | null
  /** null mientras no haya informe LISTO — no hay nada que valorar. */
  feedback?: FeedbackInforme | null
  /** Se muestra en la ficha del documento, igual que en el PDF. */
  email?: string
  /**
   * El informe se generó con un esquema anterior (ver `INFORME_VERSION`). No es
   * un error ni un dato viejo del Eneagrama: el contenido es válido, pero le
   * falta lo que agregó la versión nueva. Se ofrece regenerar, nunca se hace
   * solo.
   */
  formatoAnterior?: boolean
}

/**
 * Ventana en la que un informe PENDIENTE se considera "generándose ahora" y no
 * "interrumpido".
 *
 * El enum de la base sólo tiene PENDIENTE / LISTO / ERROR, así que no hay un
 * estado GENERANDO que distinguir. Pero sí hay una diferencia observable: la
 * auto-generación que dispara el Eneagrama deja el registro en PENDIENTE y le
 * toca `updated_at` justo antes de llamar al LLM. Un PENDIENTE recién tocado
 * está corriendo; uno de hace horas se cortó a la mitad.
 */
const MINUTOS_GENERACION = 5

function seEstaGenerando(informe: InformeData | null): boolean {
  if (informe?.estado_informe !== 'PENDIENTE' || !informe.updated_at) return false
  const transcurrido = Date.now() - new Date(informe.updated_at).getTime()
  return transcurrido >= 0 && transcurrido < MINUTOS_GENERACION * 60_000
}

function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}

export function InformeVisor({ informe, feedback, email, formatoAnterior = false }: Props) {
  const [isPending, startTransition] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)
  const router = useRouter()

  // La generación corre en el servidor, fuera de esta pestaña: nada nos avisa
  // cuando termina. Mientras dure la ventana, se vuelve a pedir la página cada
  // tanto; cuando el informe pasa a LISTO el componente sale por arriba y el
  // efecto se limpia solo.
  const generandoEnFondo = seEstaGenerando(informe)
  useEffect(() => {
    if (!generandoEnFondo) return
    const id = setInterval(() => router.refresh(), 8000)
    return () => clearInterval(id)
  }, [generandoEnFondo, router])

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
        {/* Aviso de desactualización. El cambio de datos manda sobre el cambio
            de formato: si el Eneagrama cambió, ese es el motivo que importa. */}
        {desactualizado ? (
          <Alert tone="warning" title="Tu informe está desactualizado">
            Rehiciste tu Eneagrama. Actualizá el informe para reflejar los cambios.
            <div className="mt-3">
              <Button variant="primary" size="sm" loading={isPending} onClick={handleGenerar} disabled={isPending}>
                Actualizar informe
              </Button>
            </div>
          </Alert>
        ) : formatoAnterior ? (
          <Alert tone="info" title="Hay una versión nueva de tu informe">
            Tu informe se generó con un formato anterior y ya no se puede mostrar. La versión nueva
            destaca tus fortalezas naturales, cómo trabajás y un plan de desarrollo. Regeneralo para verlo.
            <div className="mt-3">
              <Button variant="primary" size="sm" loading={isPending} onClick={handleGenerar} disabled={isPending}>
                Regenerar con el formato nuevo
              </Button>
            </div>
          </Alert>
        ) : null}
        {actionError && <Alert tone="error" title="No se pudo actualizar">{actionError}</Alert>}

        {/* Status + descarga */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge tone={desactualizado ? 'warning' : formatoAnterior ? 'info' : 'success'} dot>
              {desactualizado ? 'Desactualizado' : formatoAnterior ? 'Formato anterior' : 'Generado'}
            </Badge>
            {informe.fecha_generacion && (
              <span className="text-xs text-muted">{formatFecha(informe.fecha_generacion)}</span>
            )}
          </div>
          {!formatoAnterior && (
            <Button variant="secondary" size="sm" onClick={() => window.open('/api/informe/descargar', '_blank')}>
              Descargar informe de talentos
            </Button>
          )}
        </div>

        {/* El informe como documento — mismo diseño que el PDF que se descarga.
            El formato anterior tiene otra forma y no se dibuja. */}
        {!formatoAnterior && (
          <InformePapel
            data={data}
            email={email}
            fechaGeneracion={informe.fecha_generacion ? formatFecha(informe.fecha_generacion) : undefined}
            renderSeccionExtra={
              feedback
                ? seccion => <ReconocimientoSeccionControl seccion={seccion} inicial={feedback.secciones[seccion]} />
                : undefined
            }
          />
        )}

        {/* Cierre: una sola pregunta para el informe entero */}
        {feedback && (
          <FeedbackGlobalForm
            inicial={feedback.global}
            puedeOpinar={feedback.puedeOpinar}
            reabreAt={feedback.reabreAt}
          />
        )}

        <p className="text-right text-xs text-muted">
          Se marca como desactualizado al rehacer el Eneagrama.
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
  const estaGenerando = isPending || generandoEnFondo
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
              ? 'Generando tu informe de personalidad. Puede tardar hasta un minuto; esta página se actualiza sola.'
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
