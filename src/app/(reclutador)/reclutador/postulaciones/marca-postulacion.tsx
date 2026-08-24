'use client'

import { useTransition, useState } from 'react'
import { Alert, Button, Field, Modal, Textarea, Tooltip } from '@/components/ui'
import { CheckCircleIcon, HelpCircleIcon, CloseIcon } from '@/components/icons'
import {
  marcarPostulacion,
  avanzarEstadoPostulacion,
  revertirDescarte,
} from '@/modules/postulaciones/actions'
import { crearNota } from '@/modules/postulantes/actions'
import { MARCA_POSTULACION, ESTADO_POSTULACION, type MarcaPostulacion } from '@/lib/constants/enums'

const MAX_MOTIVO = 1000

/** Selección visible del grupo: la marca del reclutador o el descarte. */
type Seleccion = MarcaPostulacion | 'NO_AVANZA' | null

type Props = {
  postulacionId: string
  postulanteId: string
  puestoId: string | null
  tituloPuesto?: string | null
  marca: MarcaPostulacion | null
  estadoActual: string
}

// Sin selección los tres botones se muestran en su color suave. Cuando hay una
// elegida, las otras quedan en gris y recuperan su color al pasar por encima.
const estilos = {
  AVANZA: {
    activo: 'bg-success-solid text-white hover:brightness-95',
    suave: 'bg-success-bg text-success hover:bg-success-border',
    gris: 'bg-neutral-100 text-neutral-500 hover:bg-success-bg hover:text-success',
  },
  DUDA: {
    activo: 'bg-warning-solid text-white hover:brightness-95',
    suave: 'bg-warning-bg text-warning hover:bg-warning-border',
    gris: 'bg-neutral-100 text-neutral-500 hover:bg-warning-bg hover:text-warning',
  },
  NO_AVANZA: {
    activo: 'bg-error-solid text-white hover:brightness-95',
    suave: 'bg-error-bg text-error hover:bg-error-border',
    gris: 'bg-neutral-100 text-neutral-500 hover:bg-error-bg hover:text-error',
  },
}

export function MarcaPostulacionBtns({
  postulacionId,
  postulanteId,
  puestoId,
  tituloPuesto,
  marca: marcaInicial,
  estadoActual,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [marca, setMarca] = useState<MarcaPostulacion | null>(marcaInicial)
  const [descartado, setDescartado] = useState(
    estadoActual === ESTADO_POSTULACION.PROCESO_FINALIZADO,
  )
  const [confirmando, setConfirmando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState<string | null>(null)

  const seleccion: Seleccion = descartado ? 'NO_AVANZA' : marca

  /**
   * Avanzar / Duda. Si el candidato estaba en "No avanza", elegir cualquiera de
   * los dos cancela el descarte (manual o automático) y lo devuelve al proceso.
   * Las notas del descarte no se tocan: quedan como registro.
   */
  function elegirMarca(valor: MarcaPostulacion) {
    const marcaAnterior = marca
    const descarteAnterior = descartado
    const next = !descartado && marca === valor ? null : valor

    setError(null)
    setMarca(next)
    setDescartado(false)

    startTransition(async () => {
      if (descarteAnterior) {
        const revertido = await revertirDescarte(postulacionId)
        if (!revertido.success) {
          setMarca(marcaAnterior)
          setDescartado(true)
          setError(revertido.error)
          return
        }
      }

      const result = await marcarPostulacion(postulacionId, next)
      if (!result.success) {
        setMarca(marcaAnterior)
        setDescartado(descarteAnterior)
        setError(result.error)
      }
    })
  }

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

      // Sólo una opción puede quedar activa: al descartar se limpia la marca.
      if (marca) await marcarPostulacion(postulacionId, null)
      setMarca(null)
      setDescartado(true)
      setConfirmando(false)
      setMotivo('')
    })
  }

  const btn =
    'inline-flex w-full items-center justify-center gap-1 rounded-md px-1.5 h-8 ' +
    'text-[11.5px] font-semibold whitespace-nowrap transition-colors disabled:opacity-50'

  function clases(opcion: keyof typeof estilos) {
    const e = estilos[opcion]
    if (seleccion === opcion) return e.activo
    return seleccion === null ? e.suave : e.gris
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-1.5">
        <Tooltip
          className="w-full"
          content={
            <span className="block w-44 whitespace-normal leading-snug">
              {seleccion === MARCA_POSTULACION.AVANZA
                ? 'Quita la marca: el candidato deja de figurar como que avanza.'
                : 'Marca que el candidato avanza en el proceso. Aparece en el Asistente IA del puesto.'}
            </span>
          }
        >
          <button
            type="button"
            onClick={() => elegirMarca(MARCA_POSTULACION.AVANZA)}
            disabled={isPending}
            aria-pressed={seleccion === MARCA_POSTULACION.AVANZA}
            className={`${btn} ${clases('AVANZA')}`}
          >
            <CheckCircleIcon size={13} />
            Avanzar
          </button>
        </Tooltip>

        <Tooltip
          className="w-full"
          content={
            <span className="block w-44 whitespace-normal leading-snug">
              {seleccion === MARCA_POSTULACION.DUDA
                ? 'Quita la marca de duda.'
                : 'Igual que Avanzar, pero el perfil queda señalado como que está en duda.'}
            </span>
          }
        >
          <button
            type="button"
            onClick={() => elegirMarca(MARCA_POSTULACION.DUDA)}
            disabled={isPending}
            aria-pressed={seleccion === MARCA_POSTULACION.DUDA}
            className={`${btn} ${clases('DUDA')}`}
          >
            <HelpCircleIcon size={13} />
            Duda
          </button>
        </Tooltip>

        <Tooltip
          className="w-full"
          content={
            <span className="block w-44 whitespace-normal leading-snug">
              {seleccion === 'NO_AVANZA'
                ? 'El proceso está cerrado para este candidato. Para cancelarlo, elegí Avanzar o Duda.'
                : 'Cierra el proceso para este candidato y le avisa por email. Podés dejar el motivo como nota privada.'}
            </span>
          }
        >
          <button
            type="button"
            onClick={() => {
              if (seleccion === 'NO_AVANZA') return
              setError(null)
              setConfirmando(true)
            }}
            disabled={isPending}
            aria-pressed={seleccion === 'NO_AVANZA'}
            className={`${btn} ${clases('NO_AVANZA')}`}
          >
            <CloseIcon size={13} />
            No avanzar
          </button>
        </Tooltip>
      </div>

      {error && !confirmando && <Alert tone="error" title={error} className="text-xs" />}

      <Modal
        open={confirmando}
        onClose={() => setConfirmando(false)}
        title="No avanzar con este candidato"
        width={520}
      >
        <div className="space-y-4">
          <p className="text-[13px] text-muted">
            Podés dejar el motivo como nota privada del candidato (opcional). Si más adelante
            elegís &quot;Avanzar&quot; o &quot;Duda&quot;, el proceso se reabre y la nota queda
            igual como registro.
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
