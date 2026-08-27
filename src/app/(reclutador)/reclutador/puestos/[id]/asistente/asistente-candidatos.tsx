'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, Button, Badge, EmptyState, Alert, Tooltip } from '@/components/ui'
import { SparklesIcon, CheckCircleIcon, HelpCircleIcon, CloseIcon, MailIcon, UsersIcon, Spinner } from '@/components/icons'
import { MarcaPostulacionBtns } from '@/components/shared/marca-postulacion'
import { MARCA_POSTULACION, type MarcaPostulacion } from '@/lib/constants/enums'
import { MAX_CANDIDATOS_SELECCION } from '@/modules/seleccion/constants'

export type CandidatoItem = {
  postulacionId: string
  postulanteId: string
  nombre: string
  email: string | null
  fechaPostulacion: string
  /** "Duda" avanza igual que "Avanza", pero se distingue en la lista. */
  marca: MarcaPostulacion | null
  /** Estado de la postulación, para que la botonera sepa si está descartada. */
  estadoActual: string
}

type Props = {
  puestoId: string
  tituloPuesto: string
  candidatos: CandidatoItem[]
}

export function AsistenteCandidatos({ puestoId, tituloPuesto, candidatos }: Props) {
  // Working copy of the candidate list. Removals are intentionally local and
  // ephemeral: reloading the page rebuilds this list from the server, so the
  // recruiter can prune candidates for a single consultation without persisting.
  const [lista, setLista] = useState<CandidatoItem[]>(candidatos)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // El server rechaza las consultas que pasan el tope. Frenarlo acá evita
  // esperar un request completo para volver con un 400.
  const excedido = lista.length > MAX_CANDIDATOS_SELECCION

  function quitar(postulacionId: string) {
    setLista((prev) => prev.filter((f) => f.postulacionId !== postulacionId))
  }

  /**
   * La lista es "los candidatos marcados de este puesto". Si desde acá se les
   * saca la marca —o se los descarta con "No avanzar"— dejan de pertenecer a
   * ella, así que se van igual que se irían al recargar la página.
   */
  function actualizarMarca(postulacionId: string, marca: MarcaPostulacion | null) {
    if (marca === null) {
      quitar(postulacionId)
      return
    }
    setLista((prev) =>
      prev.map((f) => (f.postulacionId === postulacionId ? { ...f, marca } : f)),
    )
  }

  async function handleConsultar() {
    setError(null)
    setIsPending(true)
    try {
      // The pruned list is sent to the AI, which compares the candidates against
      // the position and returns a selection report as a downloadable PDF.
      // Nothing is stored server-side.
      const res = await fetch('/api/seleccion/informe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          puestoId,
          postulanteIds: lista.map((f) => f.postulanteId),
        }),
      })

      if (!res.ok) {
        const msg = await res.text()
        setError(msg || 'No se pudo generar el informe. Intentá de nuevo.')
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const filenameMatch = (res.headers.get('Content-Disposition') ?? '').match(
        /filename="([^"]+)"/
      )
      const a = document.createElement('a')
      a.href = url
      a.download = filenameMatch ? decodeURIComponent(filenameMatch[1]) : 'Informe-Seleccion.pdf'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError('No se pudo generar el informe. Revisá tu conexión e intentá de nuevo.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Consultar action */}
      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[14px] font-semibold text-ink">Candidatos a evaluar</p>
            <p className="text-[12.5px] text-muted">
              {lista.length} candidato{lista.length !== 1 ? 's' : ''} en la consulta. Podés sacar a
              quien no quieras incluir; la lista se restablece al recargar.
            </p>
          </div>
          <Button
            leftIcon={isPending ? <Spinner size={15} /> : <SparklesIcon size={15} />}
            loading={isPending}
            onClick={handleConsultar}
            disabled={lista.length === 0 || excedido || isPending}
            className="shrink-0"
          >
            {isPending ? 'Generando informe…' : 'Consultar'}
          </Button>
        </div>
        {excedido && (
          <Alert
            tone="warning"
            title={`El informe admite hasta ${MAX_CANDIDATOS_SELECCION} candidatos por consulta`}
            className="mt-3"
          >
            Sacá {lista.length - MAX_CANDIDATOS_SELECCION} de la lista para poder consultar.
          </Alert>
        )}
        {isPending && (
          <p className="mt-2 text-[11.5px] text-neutral-400">
            Comparando candidatos y armando el PDF. Puede tardar hasta un minuto…
          </p>
        )}
        {error && <Alert tone="error" title={error} className="mt-3" />}
      </Card>

      {/* Candidate list */}
      {lista.length === 0 ? (
        <EmptyState
          icon={<UsersIcon size={24} />}
          title="No hay candidatos en la lista"
          description={
            candidatos.length === 0
              ? 'Marcá postulantes de este puesto con "Avanzar" o "Duda" para verlos acá.'
              : 'Sacaste a todos de la lista. Recargá la página para restablecerla.'
          }
        />
      ) : (
        <div className="space-y-3">
          {lista.map((f) => (
            <Card key={f.postulacionId} padding="md">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-tint text-[13px] font-bold text-primary-600">
                    {f.nombre.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[13.5px] font-semibold text-ink">
                      {f.marca === MARCA_POSTULACION.DUDA ? (
                        <HelpCircleIcon size={13} className="shrink-0 text-warning-solid" />
                      ) : (
                        <CheckCircleIcon size={13} className="shrink-0 text-success-solid" />
                      )}
                      <span className="truncate">{f.nombre}</span>
                      {f.marca === MARCA_POSTULACION.DUDA && <Badge tone="warning">En duda</Badge>}
                    </p>
                    {f.email && (
                      <span className="mt-0.5 inline-flex items-center gap-1.5 text-[12px] text-muted">
                        <MailIcon size={12} className="shrink-0" />
                        <span className="truncate">{f.email}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <Link
                    href={`/reclutador/postulantes/${f.postulanteId}?postulacion=${f.postulacionId}&from=puesto-asistente&puesto=${puestoId}`}
                    className="inline-flex h-8 items-center rounded-md bg-primary-tint px-3 text-[12.5px] font-semibold text-primary-600 hover:bg-primary-tint-hover transition-colors whitespace-nowrap"
                  >
                    Evaluar perfil
                  </Link>
                  <Tooltip content="Quitar, no deseo comparar">
                    <button
                      type="button"
                      onClick={() => quitar(f.postulacionId)}
                      disabled={isPending}
                      aria-label={`Quitar a ${f.nombre} de esta comparación`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-ink transition-colors disabled:opacity-50"
                    >
                      <CloseIcon size={16} />
                    </button>
                  </Tooltip>
                </div>
              </div>

              {/* Misma botonera que en Postulaciones: la decisión sobre el
                  candidato no debería obligar a salir de esta pantalla. Queda
                  alineada bajo "Evaluar perfil" y la ✕, con ancho acotado para
                  no estirar los tres botones a lo largo de toda la tarjeta. */}
              <div className="mt-2 flex justify-end">
                <div className="w-full sm:w-[280px]">
                  <MarcaPostulacionBtns
                    postulacionId={f.postulacionId}
                    postulanteId={f.postulanteId}
                    puestoId={puestoId}
                    tituloPuesto={tituloPuesto}
                    marca={f.marca}
                    estadoActual={f.estadoActual}
                    onMarcaChange={(marca) => actualizarMarca(f.postulacionId, marca)}
                    onNoAvanza={() => quitar(f.postulacionId)}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
