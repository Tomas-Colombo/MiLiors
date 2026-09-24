'use client'

import { useActionState, useState, useTransition } from 'react'
import { Alert, Button, Textarea } from '@/components/ui'
import { guardarFeedbackInforme, valorarSeccion } from '@/modules/informe/actions'
import type { FeedbackInforme } from '@/modules/informe/queries'
import type { SeccionFeedbackKey } from '@/lib/types/informe'
import type { ActionResult } from '@/lib/types/domain'

/**
 * Feedback del postulante sobre su informe. Dos piezas:
 *
 *  - `ReconocimientoSeccionControl` cuelga de cada sección redactada:
 *    "¿Te reconocés en esta descripción?" de 1 a 5. Es el insumo de la
 *    validación del informe (aprobado con al menos 8 de cada 10 en 4 o 5).
 *  - `FeedbackGlobalForm` cierra el informe con una sola pregunta general.
 */

export function ReconocimientoSeccionControl({
  seccion,
  inicial,
}: {
  seccion: SeccionFeedbackKey
  inicial?: number
}) {
  const [valor, setValor] = useState<number | undefined>(inicial)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleClick(puntaje: number) {
    const previo = valor
    setValor(puntaje)
    setError(null)
    startTransition(async () => {
      const result = await valorarSeccion(seccion, puntaje)
      // Revertimos en vez de dejar marcada una respuesta que no se guardó: el
      // postulante creería que ya opinó y no reintentaría.
      if (!result.success) {
        setValor(previo)
        setError(result.error)
      }
    })
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] text-neutral-400">¿Te reconocés en esta descripción?</span>
      {[1, 2, 3, 4, 5].map(n => {
        const seleccionada = valor === n
        return (
          <button
            key={n}
            type="button"
            onClick={() => handleClick(n)}
            disabled={isPending}
            aria-pressed={seleccionada}
            aria-label={`${n} de 5`}
            className={`h-6 w-6 rounded-full border text-[11px] font-medium transition-colors disabled:opacity-50 ${
              seleccionada
                ? 'border-primary-600 bg-primary-600 text-white'
                : 'border-neutral-200 bg-surface text-muted hover:border-neutral-300 hover:text-ink'
            }`}
          >
            {n}
          </button>
        )
      })}
      <span className="text-[10.5px] text-neutral-400">1 = nada · 5 = totalmente</span>
      {error && <span className="text-[11px] text-error">{error}</span>}
    </div>
  )
}

const INITIAL_STATE: ActionResult = { success: false, error: '' }

/** 10 niveles expresados en porcentaje: es lo que se guarda tal cual. */
const PORCENTAJES = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

function formatFecha(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return iso
  }
}

/** Cuadro cerrado: la opinión ya está dada y todavía no se reabre. */
function FeedbackCerrado({ reabreAt }: { reabreAt: string | null }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-[13px] font-semibold text-ink">Gracias, ya registramos tu opinión.</p>
      <p className="mt-0.5 text-[12px] text-muted">
        {reabreAt
          ? `Vas a poder opinar de nuevo a partir del ${formatFecha(reabreAt)}.`
          : 'Vas a poder opinar de nuevo más adelante.'}
      </p>
    </div>
  )
}

export function FeedbackGlobalForm({
  inicial,
  puedeOpinar,
  reabreAt,
}: {
  inicial: FeedbackInforme['global']
  puedeOpinar: boolean
  reabreAt: string | null
}) {
  const [puntaje, setPuntaje] = useState<number | null>(inicial?.representatividad ?? null)
  const [state, action, pending] = useActionState(guardarFeedbackInforme, INITIAL_STATE)

  // Cerrado si el período de reactivación sigue corriendo, o apenas se envía:
  // dejar el formulario abierto invitaría a responder de nuevo algo ya guardado.
  if (!puedeOpinar || state.success) {
    return <FeedbackCerrado reabreAt={state.success ? null : reabreAt} />
  }

  return (
    <form action={action} className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <input type="hidden" name="representatividad" value={puntaje ?? ''} />
      <div>
        <p className="text-[13px] font-semibold text-ink">¿Cuánto te representa este informe?</p>
        <p className="mt-0.5 text-[12px] text-muted">
          Tu respuesta no cambia el informe: nos sirve para ajustar cómo se calcula.
        </p>
      </div>

      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {PORCENTAJES.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setPuntaje(n)}
              aria-pressed={puntaje === n}
              className={`h-9 min-w-[3rem] rounded-full border px-2 text-[12.5px] font-semibold tabular-nums transition-colors ${
                puntaje === n
                  ? 'border-primary-600 bg-primary-600 text-white'
                  : 'border-neutral-200 bg-surface text-muted hover:border-neutral-300 hover:text-ink'
              }`}
            >
              {n}%
            </button>
          ))}
        </div>
        <span className="text-[11px] text-neutral-400">10% = nada · 100% = totalmente</span>
      </div>
      {state.success === false && state.fieldErrors?.representatividad?.[0] && (
        <p className="text-[12px] text-error">{state.fieldErrors.representatividad[0]}</p>
      )}

      <Textarea
        name="comentario"
        rows={3}
        defaultValue={inicial?.comentario ?? ''}
        placeholder="¿Qué parte no te cerró? (opcional)"
      />

      {state.success === false && state.error && !state.fieldErrors && (
        <Alert tone="error">{state.error}</Alert>
      )}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Enviando…' : inicial ? 'Actualizar respuesta' : 'Enviar'}
      </Button>
    </form>
  )
}
