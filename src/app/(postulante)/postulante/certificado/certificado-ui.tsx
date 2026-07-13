'use client'

import { useState, useTransition } from 'react'
import { Alert, Badge, Button, Card } from '@/components/ui'
import { crearCertificado } from '@/modules/certificado/actions'
import type { CertificadoData, CertificadoContenido } from '@/modules/certificado/queries'
import { CertificadoDisplay } from '@/modules/certificado/certificado-display'
import { ArrowRightIcon, SparklesIcon } from '@/components/icons'

type Props = {
  certificado: CertificadoData | null
  contenido: CertificadoContenido | null
  informeListo: boolean
  informeDesactualizado: boolean
  tieneFormacion: boolean
  tieneCompetencia: boolean
}

function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}

export function CertificadoUI({
  certificado,
  contenido,
  informeListo,
  informeDesactualizado,
  tieneFormacion,
  tieneCompetencia,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState(false)

  function handleGenerar() {
    setError(null)
    setExito(false)
    startTransition(async () => {
      const result = await crearCertificado()
      if (!result.success) {
        setError(result.error)
      } else {
        setExito(true)
      }
    })
  }

  const puedeGenerar = informeListo && !informeDesactualizado && tieneFormacion && tieneCompetencia

  if (!informeListo) {
    return (
      <Alert tone="warning" title="Informe pendiente">
        Necesitás tener el Informe de Personalidad en estado LISTO antes de generar el certificado.
        Completá el Eneagrama y generá tu informe.
      </Alert>
    )
  }

  if (informeDesactualizado) {
    return (
      <Alert tone="warning" title="Informe en proceso de actualización">
        Tu informe de personalidad está siendo actualizado. Volvé en unos instantes para emitir el certificado.
      </Alert>
    )
  }

  // ── Certificado emitido: status + descarga + previsualización ────────────────
  if (certificado) {
    return (
      <div className="space-y-5">
        {/* Aviso de desactualización */}
        {certificado.desactualizado && (
          <Alert tone="warning" title="Tu certificado está desactualizado">
            Modificaste tu perfil desde que lo emitiste. Generá uno nuevo para reflejar los cambios.
            <div className="mt-3">
              <Button
                variant="primary"
                size="sm"
                loading={isPending}
                onClick={handleGenerar}
                disabled={isPending || !puedeGenerar}
              >
                Generar nuevo certificado
              </Button>
            </div>
          </Alert>
        )}
        {error && <Alert tone="error" title={error} />}
        {exito && (
          <Alert tone="success" title="¡Certificado generado!">
            Tu certificado se actualizó con los datos más recientes.
          </Alert>
        )}

        {/* Status + descarga */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge tone={certificado.desactualizado ? 'warning' : 'success'} dot>
              {certificado.desactualizado ? 'Desactualizado' : 'Verificado'}
            </Badge>
            <span className="text-xs text-muted">Emitido el {formatFecha(certificado.timestamp_firma)}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {certificado.url_archivo && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => window.open(`/api/certificado/descargar/${certificado.id}`, '_blank')}
              >
                Descargar certificado
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ArrowRightIcon size={14} />}
              onClick={() => window.open(`/verificar/${certificado.id}`, '_blank')}
            >
              Ver verificación pública
            </Button>
          </div>
        </div>

        {/* Previsualización del contenido */}
        {contenido && (
          <>
            <Card padding="lg">
              <h2 className="text-xl font-extrabold text-ink">{contenido.nombre}</h2>
              <p className="mt-1 text-sm text-muted">{contenido.email}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                ✓ Perfil verificado por TalentID
              </span>
            </Card>

            <Card padding="lg">
              <CertificadoDisplay data={contenido} />
            </Card>
          </>
        )}

        <p className="text-right text-xs text-muted">
          El certificado se marca como desactualizado al modificar tu perfil o tu informe.
        </p>
      </div>
    )
  }

  // ── Sin certificado: previsualización de lo que se va a certificar + emitir ──
  return (
    <div className="space-y-5">
      <Card padding="lg">
        <div className="mb-3 flex items-center gap-2">
          <SparklesIcon size={16} className="text-primary-600" />
          <span className="text-[13px] font-semibold text-ink">Generar mi certificado</span>
        </div>
        <p className="mb-4 text-xs text-muted">
          El certificado incluye tu perfil de personalidad (Eneatipo y Human Design si está cargado),
          formación académica, experiencia y competencias. Incluye un código QR verificable por
          cualquier reclutador.
        </p>

        {/* Requirements checklist */}
        <ul className="mb-4 space-y-1">
          {[
            { label: 'Informe de personalidad generado', ok: informeListo && !informeDesactualizado },
            { label: 'Al menos una formación académica', ok: tieneFormacion },
            { label: 'Al menos una competencia', ok: tieneCompetencia },
          ].map(({ label, ok }) => (
            <li key={label} className={`flex items-center gap-2 text-xs ${ok ? 'text-success' : 'text-muted'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-success' : 'bg-neutral-300'}`} />
              {label}
            </li>
          ))}
        </ul>

        {error && (
          <div className="mb-4">
            <Alert tone="error" title={error} />
          </div>
        )}

        <Button onClick={handleGenerar} loading={isPending} disabled={isPending || !puedeGenerar} className="w-full">
          {isPending ? 'Generando certificado...' : 'Generar certificado'}
        </Button>

        {isPending && <p className="mt-2 text-center text-xs text-muted">Esto puede tardar unos segundos…</p>}
      </Card>

      {/* Previsualización de lo que se certificará */}
      {contenido && (
        <>
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted">Previsualización</p>
          <Card padding="lg">
            <h2 className="text-xl font-extrabold text-ink">{contenido.nombre}</h2>
            <p className="mt-1 text-sm text-muted">{contenido.email}</p>
          </Card>
          <Card padding="lg">
            <CertificadoDisplay data={contenido} />
          </Card>
        </>
      )}
    </div>
  )
}
