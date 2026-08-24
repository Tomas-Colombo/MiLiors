'use client'

import { useState, useTransition } from 'react'
import { Alert, Badge, Button, Card } from '@/components/ui'
import { crearCertificado, regenerarSintesisCertificado } from '@/modules/certificado/actions'
import type { CertificadoData, CertificadoContenido } from '@/modules/certificado/queries'
import type { SintesisEstado } from '@/lib/types/certificado'
import { CertificadoDisplay } from '@/modules/certificado/certificado-display'
import { ArrowRightIcon, SparklesIcon } from '@/components/icons'

type Props = {
  certificado: CertificadoData | null
  contenido: CertificadoContenido | null
  informeListo: boolean
  informeDesactualizado: boolean
  tieneFormacion: boolean
  tieneCompetencia: boolean
  /** "¿Qué estudiaste / qué buscás?" cargado en el perfil — eje del certificado, nunca puede faltar. */
  tieneObjetivo: boolean
  sintesisEstado: SintesisEstado
  sintesisDesactualizada: boolean
}

function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}

/**
 * Generación/actualización de la síntesis integrada — mismo patrón que el
 * informe: no se muestra nada cuando está LISTA y al día. El botón aparece solo
 * si nunca se generó (o dio error) o si el informe quedó más nuevo que ella.
 */
function SintesisPanel({
  sintesisEstado,
  sintesisDesactualizada,
  tieneCompetencia,
  tieneObjetivo,
}: {
  sintesisEstado: SintesisEstado
  sintesisDesactualizada: boolean
  tieneCompetencia: boolean
  tieneObjetivo: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleRegenerar() {
    setError(null)
    startTransition(async () => {
      const result = await regenerarSintesisCertificado()
      if (!result.success) setError(result.error)
    })
  }

  const nuncaGenerada = sintesisEstado !== 'LISTO' // PENDIENTE (nunca) o ERROR
  const necesitaActualizar = sintesisEstado === 'LISTO' && sintesisDesactualizada

  // Al día y ya generada → sin cartel ni botón.
  if (!nuncaGenerada && !necesitaActualizar) return null

  // Desactualizada: aviso + botón para actualizar (como el informe).
  if (necesitaActualizar) {
    return (
      <>
        <Alert tone="warning" title="Tu perfil integrado está desactualizado">
          No refleja tus datos más recientes. Regeneralo para ponerlo al día.
          <div className="mt-3">
            <Button
              variant="primary"
              size="sm"
              loading={isPending}
              onClick={handleRegenerar}
              disabled={isPending || !tieneCompetencia || !tieneObjetivo}
            >
              Actualizar perfil integrado
            </Button>
          </div>
        </Alert>
        {error && <Alert tone="error" title={error} />}
      </>
    )
  }

  // Nunca generada / error: botón para generar.
  return (
    <div className="space-y-3">
      {sintesisEstado === 'ERROR' && (
        <Alert tone="error" title="No se pudo generar el perfil integrado">
          Hubo un problema al generarlo. Podés reintentarlo ahora.
        </Alert>
      )}
      {error && <Alert tone="error" title={error} />}
      <Button
        variant="primary"
        loading={isPending}
        onClick={handleRegenerar}
        disabled={isPending || !tieneCompetencia || !tieneObjetivo}
        leftIcon={<SparklesIcon size={14} />}
      >
        {sintesisEstado === 'ERROR' ? 'Reintentar' : 'Generar perfil integrado'}
      </Button>
      {!tieneObjetivo && (
        <p className="text-xs text-muted">
          Completá &quot;¿Qué estudiaste / qué buscás?&quot; en{' '}
          <a href="/postulante/mi-perfil" className="font-semibold text-primary-600 underline">
            tu perfil
          </a>{' '}
          antes de generarlo.
        </p>
      )}
      {tieneObjetivo && !tieneCompetencia && (
        <p className="text-xs text-muted">Necesitás al menos una habilidad o tecnología cargada.</p>
      )}
    </div>
  )
}

export function CertificadoUI({
  certificado,
  contenido,
  informeListo,
  informeDesactualizado,
  tieneFormacion,
  tieneCompetencia,
  tieneObjetivo,
  sintesisEstado,
  sintesisDesactualizada,
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

  const sintesisLista = sintesisEstado === 'LISTO'
  const puedeGenerar =
    informeListo && !informeDesactualizado && tieneFormacion && tieneCompetencia && tieneObjetivo && sintesisLista

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

        <SintesisPanel
          sintesisEstado={sintesisEstado}
          sintesisDesactualizada={sintesisDesactualizada}
          tieneCompetencia={tieneCompetencia}
          tieneObjetivo={tieneObjetivo}
        />

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
          <CertificadoDisplay
            data={contenido}
            certificadoId={certificado.id}
            emitidoEl={formatFecha(certificado.timestamp_firma)}
          />
        )}

        <p className="text-right text-xs text-muted">
          El certificado se marca como desactualizado al modificar tu perfil o tu informe.
        </p>
      </div>
    )
  }

  // ── Sin certificado: síntesis + previsualización + emitir ────────────────────
  return (
    <div className="space-y-5">
      <SintesisPanel
        sintesisEstado={sintesisEstado}
        sintesisDesactualizada={sintesisDesactualizada}
        tieneCompetencia={tieneCompetencia}
        tieneObjetivo={tieneObjetivo}
      />

      <Card padding="lg">
        <div className="mb-3 flex items-center gap-2">
          <SparklesIcon size={16} className="text-primary-600" />
          <span className="text-[13px] font-semibold text-ink">Generar mi certificado</span>
        </div>
        <p className="mb-4 text-xs text-muted">
          El certificado resume tu perfil en una página: síntesis de personalidad, competencias destacadas,
          habilidades técnicas con su nivel, tus últimos 3 puestos y tu formación. Incluye un código QR que lleva
          a tu perfil completo verificado.
        </p>

        {/* Requirements checklist */}
        <ul className="mb-4 space-y-1">
          {[
            { label: 'Informe de personalidad generado', ok: informeListo && !informeDesactualizado },
            { label: '¿Qué estudiaste / qué buscás? cargado en tu perfil', ok: tieneObjetivo },
            { label: 'Perfil profesional integrado generado', ok: sintesisLista },
            { label: 'Al menos una formación académica', ok: tieneFormacion },
            { label: 'Al menos una habilidad o tecnología', ok: tieneCompetencia },
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
          <CertificadoDisplay data={contenido} />
        </>
      )}
    </div>
  )
}
