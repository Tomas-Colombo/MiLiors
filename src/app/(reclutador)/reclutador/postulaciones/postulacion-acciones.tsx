'use client'

import { useTransition, useState } from 'react'
import { Button, Alert, Tooltip, Modal, Textarea, Field } from '@/components/ui'
import { avanzarEstadoPostulacion } from '@/modules/postulaciones/actions'
import { crearNota } from '@/modules/postulantes/actions'
import { ESTADO_POSTULACION } from '@/lib/constants/enums'

const MAX_MOTIVO = 1000

type Props = {
  postulacionId: string
  postulanteId: string
  puestoId: string | null
  tituloPuesto?: string | null
  estadoActual: string
}

export function PostulacionAcciones({
  postulacionId, postulanteId, puestoId, tituloPuesto, estadoActual,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [motivo, setMotivo] = useState('')

  // El motivo es opcional: si se confirma sin texto, sólo cambia el estado.
  // Si hay texto, se guarda antes como nota privada del candidato.
  function noAvanzar() {
    setError(null)
    startTransition(async () => {
      const texto = motivo.trim()
      if (texto) {
        const contenido = tituloPuesto
          ? `Motivo de no avanzar en "${tituloPuesto}": ${texto}`
          : `Motivo de no avanzar: ${texto}`
        const nota = await crearNota(postulanteId, contenido, puestoId ?? undefined)
        if (!nota.success) {
          setError(nota.error)
          return
        }
      }

      const result = await avanzarEstadoPostulacion(postulacionId, 'PROCESO_FINALIZADO')
      if (!result.success) {
        setError(result.error)
        return
      }
      setConfirmando(false)
      setMotivo('')
    })
  }

  const isClosed =
    estadoActual === ESTADO_POSTULACION.PROCESO_FINALIZADO ||
    estadoActual === ESTADO_POSTULACION.CERRADA

  return (
    <div className="flex flex-col gap-2 items-stretch w-full">
      {!isClosed && (
        <Tooltip
          className="w-full"
          content={
            <span className="block w-44 whitespace-normal leading-snug">
              Cierra el proceso para este candidato y le avisa por email. Podés dejar el motivo
              como nota privada. Se puede revertir.
            </span>
          }
        >
          <Button
            variant="destructive"
            size="sm"
            className="w-full"
            onClick={() => {
              setError(null)
              setConfirmando(true)
            }}
          >
            No avanzar
          </Button>
        </Tooltip>
      )}

      {error && !confirmando && <Alert tone="error" title={error} className="text-xs" />}

      <Modal
        open={confirmando}
        onClose={() => setConfirmando(false)}
        title="No avanzar con este candidato"
        width={520}
      >
        <div className="space-y-4">
          <p className="text-[13px] text-muted">
            Podés dejar el motivo como nota privada del candidato (opcional). Si no querés
            escribir nada, tocá &quot;No avanzar&quot; de nuevo.
          </p>

          <Field
            label="Motivo"
            htmlFor="motivo-no-avanzar"
            hint={`${motivo.length}/${MAX_MOTIVO} caracteres. Se guarda como nota privada${
              tituloPuesto ? ` del puesto "${tituloPuesto}"` : ''
            }.`}
          >
            <Textarea
              id="motivo-no-avanzar"
              value={motivo}
              maxLength={MAX_MOTIVO}
              onChange={(e) => setMotivo(e.target.value)}
              rows={4}
              placeholder="Ej.: no cumple con la experiencia requerida en el stack del puesto."
            />
          </Field>

          {error && <Alert tone="error" title={error} className="text-xs" />}

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setConfirmando(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button variant="destructive" size="sm" loading={isPending} onClick={noAvanzar}>
              No avanzar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
