'use client'

import Link from 'next/link'
import { useTransition, useState, useEffect } from 'react'
import { Button, Modal, Alert, Tooltip, SearchableSelect, Input, Radio } from '@/components/ui'
import { AlertTriangleIcon, CheckCircleIcon, TrashIcon, SparklesIcon, Spinner } from '@/components/icons'
import {
  cerrarPuesto,
  reactivarPuesto,
  eliminarPuesto,
  getPostulantesDePuesto,
  contarPostulacionesDelUltimoCiclo,
  type ContratacionInput,
} from '@/modules/puestos/actions'

type Props = {
  puestoId: string
  activo: boolean
}

type Modo = 'cerrar' | 'eliminar' | 'reactivar'
type Origen = 'ninguna' | 'plataforma' | 'externo'

export function PuestoAcciones({ puestoId, activo }: Props) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Modal de pausa/eliminación con registro de contratación, y de reactivación
  const [modo, setModo] = useState<Modo | null>(null)
  const [origen, setOrigen] = useState<Origen>('ninguna')
  const [postulanteId, setPostulanteId] = useState('')
  const [nombreExterno, setNombreExterno] = useState('')
  const [postulantes, setPostulantes] = useState<{ postulanteId: string; nombre: string }[] | null>(null)
  const [archivadas, setArchivadas] = useState<number | null>(null)

  const registraContratacion = modo === 'cerrar' || modo === 'eliminar'

  // Cargar los datos del modal al abrirlo (una sola vez cada uno)
  useEffect(() => {
    if (registraContratacion && postulantes === null) {
      getPostulantesDePuesto(puestoId).then(setPostulantes)
    }
    if (modo === 'reactivar' && archivadas === null) {
      contarPostulacionesDelUltimoCiclo(puestoId).then(setArchivadas)
    }
  }, [modo, registraContratacion, postulantes, archivadas, puestoId])

  function abrirModal(m: Modo) {
    setError(null)
    setOrigen('ninguna')
    setPostulanteId('')
    setNombreExterno('')
    // El conteo depende del ciclo vigente: si el puesto se cerró y reactivó sin
    // remontar el componente, el valor cacheado sería de otro ciclo.
    setArchivadas(null)
    setModo(m)
  }

  function cerrarModal() {
    if (!isPending) {
      setModo(null)
      setError(null)
    }
  }

  // Cambiar de opción limpia la selección previa (los campos se remontan vacíos)
  function cambiarOrigen(o: Origen) {
    setOrigen(o)
    setPostulanteId('')
    setNombreExterno('')
    setError(null)
  }

  function handleConfirmar() {
    setError(null)

    if (modo === 'reactivar') {
      startTransition(async () => {
        const result = await reactivarPuesto(puestoId)
        if (!result.success) setError(result.error)
        else setModo(null)
      })
      return
    }

    // Construir la contratación a partir de la selección
    let contratacion: ContratacionInput | null = null
    if (origen === 'plataforma') {
      if (!postulanteId) {
        setError('Elegí el postulante contratado.')
        return
      }
      contratacion = { tipo: 'plataforma', postulanteId }
    } else if (origen === 'externo') {
      // El nombre es opcional: se puede registrar la contratación externa sin él.
      contratacion = { tipo: 'externo', nombre: nombreExterno.trim() }
    }

    const accion = modo
    startTransition(async () => {
      const result =
        accion === 'eliminar'
          ? await eliminarPuesto(puestoId, contratacion)
          : await cerrarPuesto(puestoId, contratacion)
      if (!result.success) {
        setError(result.error)
      } else {
        setModo(null)
      }
      // Si success, el revalidatePath refresca la lista
    })
  }

  const sinPostulantes = postulantes !== null && postulantes.length === 0

  return (
    <div className="flex flex-col gap-2 items-center">
      <div className="flex flex-nowrap items-center justify-center gap-1.5">
        <Link
          href={`/reclutador/puestos/${puestoId}`}
          className="inline-flex h-7 items-center rounded-[6px] border border-neutral-300 bg-surface px-2.5 text-[11.5px] font-semibold text-ink-soft hover:bg-neutral-50"
        >
          Ver
        </Link>
        <Link
          href={`/reclutador/postulaciones?puesto=${puestoId}`}
          className="inline-flex h-7 items-center rounded-[6px] border border-neutral-300 bg-surface px-2.5 text-[11.5px] font-semibold text-ink-soft hover:bg-neutral-50 whitespace-nowrap"
        >
          Postulaciones
        </Link>
        <Link
          href={`/reclutador/puestos/${puestoId}/editar`}
          className="inline-flex h-7 items-center rounded-[6px] border border-neutral-300 bg-surface px-2.5 text-[11.5px] font-semibold text-ink-soft hover:bg-neutral-50"
        >
          Editar
        </Link>
        <Tooltip content="Asistente IA">
          <Link
            href={`/reclutador/puestos/${puestoId}/asistente`}
            aria-label="Asistente IA"
            className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] border border-neutral-300 bg-surface text-primary-600 hover:bg-primary-tint"
          >
            <SparklesIcon size={14} />
          </Link>
        </Tooltip>
        {activo ? (
          <button
            type="button"
            onClick={() => abrirModal('cerrar')}
            disabled={isPending}
            className="inline-flex h-7 min-w-[76px] items-center justify-center gap-1.5 rounded-[6px] bg-error-solid px-2.5 text-[11.5px] font-semibold text-white hover:bg-error disabled:bg-neutral-disabled disabled:cursor-not-allowed"
          >
            {isPending && modo === 'cerrar' ? <Spinner size={13} /> : 'Pausar'}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => abrirModal('reactivar')}
            disabled={isPending}
            className="inline-flex h-7 min-w-[76px] items-center justify-center gap-1.5 rounded-[6px] bg-primary-tint px-2.5 text-[11.5px] font-semibold text-primary-600 hover:bg-primary-tint-hover disabled:text-neutral-400 disabled:bg-neutral-100 disabled:cursor-not-allowed"
          >
            {isPending && modo === 'reactivar' ? <Spinner size={13} /> : 'Reactivar'}
          </button>
        )}
        <Tooltip content="Eliminar puesto">
          <button
            type="button"
            aria-label="Eliminar puesto"
            className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-neutral-400 hover:bg-error-bg hover:text-error disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => abrirModal('eliminar')}
            disabled={isPending}
          >
            <TrashIcon size={15} />
          </button>
        </Tooltip>
      </div>
      <Modal
        open={modo !== null}
        onClose={cerrarModal}
        icon={
          modo === 'reactivar' ? (
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-tint text-primary-600">
              <CheckCircleIcon size={22} strokeWidth={2} />
            </span>
          ) : (
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-error-bg text-error">
              <AlertTriangleIcon size={22} strokeWidth={2} />
            </span>
          )
        }
        title={
          modo === 'eliminar'
            ? '¿Eliminar este puesto?'
            : modo === 'reactivar'
              ? '¿Reactivar este puesto?'
              : '¿Pausar este puesto?'
        }
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={cerrarModal} disabled={isPending}>
              Cancelar
            </Button>
            <Button
              variant={modo === 'eliminar' ? 'destructive' : 'primary'}
              className="flex-1"
              loading={isPending}
              onClick={handleConfirmar}
            >
              {modo === 'eliminar' ? 'Eliminar' : modo === 'reactivar' ? 'Reactivar' : 'Pausar'}
            </Button>
          </>
        }
      >
        {modo === 'eliminar' ? (
          <p className="text-sm text-ink-soft">
            El puesto <strong>desaparecerá de tu perfil</strong> junto con el rastro de sus
            postulaciones. Esta acción no se puede deshacer.
          </p>
        ) : modo === 'reactivar' ? (
          <div className="space-y-2 text-sm text-ink-soft">
            <p>
              Vuelve a aparecer en el listado y a <strong>recibir postulaciones</strong>.
            </p>
            {archivadas === null ? (
              <p className="flex items-center gap-2 text-xs text-neutral-400">
                <Spinner size={13} /> Revisando las postulaciones del ciclo anterior…
              </p>
            ) : archivadas > 0 ? (
              <p>
                <strong>
                  {archivadas === 1
                    ? 'La postulación del ciclo anterior queda archivada'
                    : `Las ${archivadas} postulaciones del ciclo anterior quedan archivadas`}
                </strong>
                : el puesto arranca sin postulaciones. El historial queda disponible con el
                filtro <strong>Ciclos anteriores</strong>, y quienes se habían postulado antes
                van a poder volver a hacerlo.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-ink-soft">
            Dejará de recibir postulaciones y deja de aparecer en las búsquedas. Podés
            <strong> reactivarlo</strong> más adelante.
          </p>
        )}

        {/* Registro de contratación (opcional) */}
        {registraContratacion && (
        <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3.5">
          <p className="text-[13px] font-semibold text-ink">
            ¿Contrataste a alguien para este puesto?
          </p>
          <p className="mt-0.5 text-xs text-neutral-400">
            Opcional. Nos sirve para medir cuánto tarda en cubrirse un puesto.
          </p>

          <div className="mt-3 space-y-2.5">
            <Radio
              name={`origen-${puestoId}`}
              label="No contraté a nadie"
              checked={origen === 'ninguna'}
              disabled={isPending}
              onChange={() => cambiarOrigen('ninguna')}
            />

            <div>
              <Radio
                name={`origen-${puestoId}`}
                label="Contraté a un postulante de la plataforma"
                checked={origen === 'plataforma'}
                disabled={isPending || sinPostulantes}
                onChange={() => cambiarOrigen('plataforma')}
              />
              {origen === 'plataforma' && (
                <div className="mt-2 pl-8">
                  {postulantes === null ? (
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <Spinner size={13} /> Cargando postulantes…
                    </div>
                  ) : (
                    <SearchableSelect
                      name={`postulante-${puestoId}`}
                      placeholder="Escribí para buscar el postulante…"
                      onValueChange={setPostulanteId}
                      options={postulantes.map((p) => ({ value: p.postulanteId, label: p.nombre }))}
                    />
                  )}
                </div>
              )}
              {sinPostulantes && (
                <p className="mt-1 pl-8 text-xs text-neutral-400">
                  Este puesto no tiene postulantes en la plataforma.
                </p>
              )}
            </div>

            <div>
              <Radio
                name={`origen-${puestoId}`}
                label="Contraté a alguien fuera de la plataforma"
                checked={origen === 'externo'}
                disabled={isPending}
                onChange={() => cambiarOrigen('externo')}
              />
              {origen === 'externo' && (
                <div className="mt-2 pl-8">
                  <Input
                    value={nombreExterno}
                    disabled={isPending}
                    placeholder="Nombre de la persona (opcional)"
                    onChange={(e) => setNombreExterno(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {error && <Alert tone="error" title={error} className="mt-3 text-xs" />}
      </Modal>
    </div>
  )
}
