'use client'

import { useActionState, useState, useTransition } from 'react'
import { Alert, Button, Textarea } from '@/components/ui'
import { valorarCompetencia, guardarFeedbackInforme } from '@/modules/informe/actions'
import type { FeedbackInforme, ValoracionCompetencia } from '@/modules/informe/queries'
import type { ActionResult } from '@/lib/types/domain'

/**
 * Feedback del postulante sobre su informe. Dos piezas separadas a propósito:
 *
 *  - `ValoracionCompetenciaControl` cuelga de cada una de las 13 competencias.
 *    Es el único feedback que mapea a un número corregible del motor, y por eso
 *    es DIRECCIONAL: "no estoy de acuerdo" no diría para qué lado mover el peso.
 *  - `FeedbackGlobalForm` cierra el informe con una sola pregunta. Cubre la prosa
 *    del LLM (talentos, "cómo trabaja", descripción) sin pedir ~28 respuestas,
 *    que es donde la gente abandona.
 */

const OPCIONES: { valor: ValoracionCompetencia; label: string }[] = [
  { valor: 'SUBESTIMA', label: 'Me queda bajo' },
  { valor: 'JUSTO', label: 'Está bien' },
  { valor: 'SOBRESTIMA', label: 'Me queda alto' },
]

export function ValoracionCompetenciaControl({
  nombre,
  inicial,
}: {
  nombre: string
  inicial?: ValoracionCompetencia
}) {
  const [valor, setValor] = useState<ValoracionCompetencia | undefined>(inicial)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleClick(opcion: ValoracionCompetencia) {
    const previo = valor
    setValor(opcion)
    setError(null)
    startTransition(async () => {
      const result = await valorarCompetencia(nombre, opcion)
      // Revertimos en vez de dejar marcada una respuesta que no se guardó: el
      // postulante creería que ya opinó y no reintentaría.
      if (!result.success) {
        setValor(previo)
        setError(result.error)
      }
    })
  }

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] text-neutral-400">¿Te representa?</span>
      {OPCIONES.map(o => {
        const seleccionada = valor === o.valor
        return (
          <button
            key={o.valor}
            type="button"
            onClick={() => handleClick(o.valor)}
            disabled={isPending}
            aria-pressed={seleccionada}
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors disabled:opacity-50 ${
              seleccionada
                ? 'border-primary-600 bg-primary-600 text-white'
                : 'border-neutral-200 bg-surface text-muted hover:border-neutral-300 hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        )
      })}
      {error && <span className="text-[11px] text-error">{error}</span>}
    </div>
  )
}

const INITIAL_STATE: ActionResult = { success: false, error: '' }

const PUNTAJES = [1, 2, 3, 4, 5]

export function FeedbackGlobalForm({ inicial }: { inicial: FeedbackInforme['global'] }) {
  const [puntaje, setPuntaje] = useState<number | null>(inicial?.representatividad ?? null)
  const [state, action, pending] = useActionState(guardarFeedbackInforme, INITIAL_STATE)

  return (
    <form action={action} className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <input type="hidden" name="representatividad" value={puntaje ?? ''} />
      <div>
        <p className="text-[13px] font-semibold text-ink">¿Cuánto te representa este informe?</p>
        <p className="mt-0.5 text-[12px] text-muted">
          Tu respuesta no cambia el informe: nos sirve para ajustar cómo se calcula.
        </p>
      </div>

      <div className="flex items-center gap-2">
        {PUNTAJES.map(n => (
          <button
            key={n}
            type="button"
            onClick={() => setPuntaje(n)}
            aria-pressed={puntaje === n}
            className={`h-9 w-9 rounded-full border text-[13px] font-semibold transition-colors ${
              puntaje === n
                ? 'border-primary-600 bg-primary-600 text-white'
                : 'border-neutral-200 bg-surface text-muted hover:border-neutral-300 hover:text-ink'
            }`}
          >
            {n}
          </button>
        ))}
        <span className="ml-1 text-[11px] text-neutral-400">1 = nada · 5 = mucho</span>
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
      {state.success && <Alert tone="success">Gracias, registramos tu respuesta.</Alert>}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? 'Enviando…' : inicial ? 'Actualizar respuesta' : 'Enviar'}
      </Button>
    </form>
  )
}
