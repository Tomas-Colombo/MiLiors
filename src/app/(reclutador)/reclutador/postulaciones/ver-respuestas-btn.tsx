'use client'

import { useState, useTransition } from 'react'
import { Modal, Badge, Alert, Skeleton } from '@/components/ui'
import { FileTextIcon } from '@/components/icons'
import { getRespuestasParaReclutador, type RespuestaParaReclutador } from '@/modules/preselector/actions'
import { cn } from '@/lib/utils'

type Props = {
  postulacionId: string
  nombrePostulante?: string | null
}

export function VerRespuestasBtn({ postulacionId, nombrePostulante }: Props) {
  const [open, setOpen] = useState(false)
  const [respuestas, setRespuestas] = useState<RespuestaParaReclutador[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleOpen() {
    setOpen(true)
    // Answers are immutable once submitted; fetch once and reuse across re-opens.
    if (respuestas !== null || isPending) return
    startTransition(async () => {
      const result = await getRespuestasParaReclutador(postulacionId)
      if (result.success) {
        setRespuestas(result.data)
        setError(null)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary-tint px-3 h-8 text-[12.5px] font-semibold text-primary-600 hover:bg-primary-tint-hover transition-colors whitespace-nowrap"
      >
        <FileTextIcon size={14} />
        Ver respuestas
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Respuestas del formulario preselector"
        width={560}
      >
        <div className="space-y-3">
          {nombrePostulante && (
            <p className="text-[13px] text-muted">
              Respuestas de <span className="font-semibold text-ink-soft">{nombrePostulante}</span>
            </p>
          )}

          {error && <Alert tone="error" title={error} />}

          {isPending && (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          )}

          {respuestas && respuestas.length === 0 && (
            <p className="text-[13px] text-neutral-400">
              Esta postulación no tiene respuestas de preselección.
            </p>
          )}

          {respuestas?.map((r, i) => (
            <div
              key={i}
              className={cn(
                'rounded-lg border px-3.5 py-2.5',
                r.fallidaCritica ? 'border-error-border bg-error-bg' : 'border-neutral-200',
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13px] font-semibold text-ink">{r.preguntaTexto}</p>
                {r.esCritica && (
                  <Badge tone={r.fallidaCritica ? 'error' : 'success'}>
                    {r.fallidaCritica ? 'Eliminatoria · no superada' : 'Eliminatoria · superada'}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-[13px] text-ink-soft whitespace-pre-wrap">{r.respuestaTexto}</p>
            </div>
          ))}
        </div>
      </Modal>
    </>
  )
}
