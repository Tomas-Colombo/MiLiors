'use client'

import { useState, useTransition } from 'react'
import { Alert, Badge, Button, Card } from '@/components/ui'
import { crearCertificado } from '@/modules/certificado/actions'
import type { CertificadoData } from '@/modules/certificado/queries'
import { ArrowRightIcon, FileIcon, ShieldIcon, SparklesIcon } from '@/components/icons'

type Props = {
  certificado: CertificadoData | null
  informeListo: boolean
}

export function CertificadoUI({ certificado, informeListo }: Props) {
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

  if (!informeListo) {
    return (
      <Alert tone="warning" title="Informe pendiente">
        Necesitás tener el Informe de Personalidad en estado LISTO antes de generar el certificado.
        Completá el Eneagrama y generá tu informe.
      </Alert>
    )
  }

  return (
    <div className="space-y-4">
      {/* Current certificate state */}
      {certificado ? (
        <Card padding="lg">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-primary-50">
                <ShieldIcon size={20} className="text-primary-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[13.5px] font-semibold text-ink">Certificado activo</span>
                  <Badge tone="success" dot>Verificado</Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  Emitido el{' '}
                  {new Date(certificado.timestamp_firma).toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-faint">{certificado.id}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<FileIcon size={15} />}
              onClick={() => window.open(`/api/certificado/descargar/${certificado.id}`, '_blank')}
            >
              Descargar PDF
            </Button>
            <Button
              size="sm"
              variant="ghost"
              rightIcon={<ArrowRightIcon size={14} />}
              onClick={() => window.open(`/verificar/${certificado.id}`, '_blank')}
            >
              Ver verificación pública
            </Button>
          </div>
        </Card>
      ) : (
        <Card padding="lg">
          <div className="flex items-center gap-3 text-muted">
            <FileIcon size={20} />
            <span className="text-sm">Todavía no generaste un certificado.</span>
          </div>
        </Card>
      )}

      {/* Generate new certificate */}
      <Card padding="lg">
        <div className="mb-4 flex items-center gap-2">
          <SparklesIcon size={16} className="text-primary-600" />
          <span className="text-[13px] font-semibold text-ink">
            {certificado ? 'Emitir nuevo certificado' : 'Generar mi certificado'}
          </span>
        </div>
        <p className="mb-4 text-xs text-muted">
          El certificado incluye tu perfil de personalidad (Eneatipo y Human Design si está cargado),
          formación académica, experiencia y competencias. Incluye un código QR verificable por
          cualquier reclutador.
        </p>

        {exito && (
          <div className="mb-4">
            <Alert tone="success" title="¡Certificado generado!">
              Ya podés descargarlo desde arriba.
            </Alert>
          </div>
        )}
        {error && (
          <div className="mb-4">
            <Alert tone="error" title={error} />
          </div>
        )}

        <Button
          onClick={handleGenerar}
          loading={isPending}
          disabled={isPending}
          className="w-full"
        >
          {isPending
            ? 'Generando certificado...'
            : certificado
              ? 'Generar nuevo certificado'
              : 'Generar certificado'}
        </Button>

        {isPending && (
          <p className="mt-2 text-center text-xs text-muted">Esto puede tardar unos segundos…</p>
        )}
      </Card>
    </div>
  )
}
