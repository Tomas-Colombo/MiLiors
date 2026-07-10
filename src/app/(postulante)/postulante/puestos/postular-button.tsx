'use client'

import { useActionState, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Modal, Radio, Textarea, Field, Alert } from '@/components/ui'
import { cn } from '@/lib/utils'
import { postularAPuesto, postularAPuestoConFormulario } from '@/modules/postulaciones/actions'
import { TIPO_PREGUNTA_PRESELECTOR } from '@/lib/constants/enums'
import type { ActionResult } from '@/lib/types/domain'

// Sanitized shape for the applicant: no esCritica / esValida — the applicant
// must never be able to read which answers are "correct" from the page payload.
export type PreguntaPublica = {
  id: string
  texto: string
  tipo: 'OPCIONES' | 'TEXTO_LIBRE'
  opciones: { id: string; texto: string }[]
}

type Props = {
  puestoId: string
  yaPostulo: boolean
  disabled?: boolean
  preguntas?: PreguntaPublica[]
  /** Set by surfaces that know the puesto has a form but don't load its questions (e.g. the listing). */
  tieneFormulario?: boolean
}

const initialState: ActionResult<{ descartada: boolean }> = { success: false, error: '' }

export function PostularButton({ puestoId, yaPostulo, disabled, preguntas, tieneFormulario }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [modalOpen, setModalOpen] = useState(false)
  const [respuestas, setRespuestas] = useState<Record<string, string>>({})

  const boundAction = postularAPuestoConFormulario.bind(null, puestoId)
  const [state, action, isSubmitting] = useActionState(boundAction, initialState)

  const conPreguntas = !!preguntas && preguntas.length > 0
  const yaEnviado = conPreguntas && state.success
  const yaPostuloEfectivo = yaPostulo || yaEnviado
  const todasRespondidas = !conPreguntas || preguntas!.every((p) => (respuestas[p.id] ?? '').trim().length > 0)

  function handleClick() {
    if (yaPostuloEfectivo) return
    if (conPreguntas) {
      setModalOpen(true)
      return
    }
    if (tieneFormulario) {
      // The questions live on the detail page; postularAPuesto refuses
      // form-bearing puestos server-side, so navigate instead of submitting.
      router.push(`/postulante/puestos/${puestoId}`)
      return
    }
    startTransition(async () => {
      await postularAPuesto(puestoId)
    })
  }

  return (
    <>
      <Button
        variant={yaPostuloEfectivo ? 'secondary' : 'primary'}
        size="sm"
        loading={isPending}
        disabled={disabled || yaPostuloEfectivo}
        onClick={handleClick}
      >
        {yaPostuloEfectivo ? 'Ya postulaste' : 'Postularme'}
      </Button>

      {conPreguntas && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Formulario de preselección"
          width={520}
        >
          {state.success ? (
            // El descarte por respuesta crítica es silencioso: al postulante
            // siempre se le confirma el envío, sin revelar la evaluación.
            <Alert tone="success" title="¡Postulación enviada!">
              Recibimos tu postulación junto con tus respuestas.
            </Alert>
          ) : (
            <form action={action} className="space-y-4">
              {state.error && <Alert tone="error" title={state.error} />}

              {preguntas!.map((p) => (
                <Field
                  key={p.id}
                  label={p.texto}
                  required
                  error={state.fieldErrors?.[`respuesta_${p.id}`]?.[0]}
                >
                  {p.tipo === TIPO_PREGUNTA_PRESELECTOR.OPCIONES ? (
                    <>
                      <input type="hidden" name={`respuesta_${p.id}`} value={respuestas[p.id] ?? ''} />
                      <div className="space-y-2">
                        {p.opciones.map((o) => (
                          <Radio
                            key={o.id}
                            label={o.texto}
                            checked={respuestas[p.id] === o.id}
                            onChange={() => setRespuestas((prev) => ({ ...prev, [p.id]: o.id }))}
                            className={cn(
                              'flex w-full rounded-lg border px-3 py-2.5 transition-colors',
                              respuestas[p.id] === o.id
                                ? 'border-primary-600 bg-primary-50'
                                : 'border-neutral-200 hover:bg-neutral-50',
                            )}
                          />
                        ))}
                      </div>
                    </>
                  ) : (
                    <Textarea
                      name={`respuesta_${p.id}`}
                      rows={3}
                      value={respuestas[p.id] ?? ''}
                      onChange={(e) => setRespuestas((prev) => ({ ...prev, [p.id]: e.target.value }))}
                    />
                  )}
                </Field>
              ))}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" loading={isSubmitting} disabled={!todasRespondidas}>
                  Enviar respuestas
                </Button>
              </div>
            </form>
          )}
        </Modal>
      )}
    </>
  )
}
