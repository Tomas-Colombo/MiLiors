'use client'

import { useState, useTransition } from 'react'
import { Modal, Tooltip, buttonClassName } from '@/components/ui'
import { FileTextIcon } from '@/components/icons'
import {
  getNotasDePostulante,
  type NotaData,
} from '@/modules/postulantes/actions'
import { NotasCandidato } from '@/components/shared/notas-candidato'

type Props = {
  postulanteId: string
  puestoId: string | null
  nombrePostulante?: string | null
}

export function NotasModalBtn({ postulanteId, puestoId, nombrePostulante }: Props) {
  const [open, setOpen] = useState(false)
  const [notas, setNotas] = useState<NotaData[] | null>(null)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [cargando, startCarga] = useTransition()

  function handleOpen() {
    setOpen(true)
    setErrorCarga(null)
    // Fetch notes lazily the first time the modal opens.
    if (notas !== null || cargando) return
    startCarga(async () => {
      const result = await getNotasDePostulante(postulanteId)
      if (result.success) setNotas(result.data)
      else setErrorCarga(result.error)
    })
  }

  return (
    <>
      <Tooltip
        className="w-full"
        content={
          <span className="block w-44 whitespace-normal leading-snug">
            Notas privadas sobre el candidato. Sólo las ves vos.
          </span>
        }
      >
        <button
          type="button"
          onClick={handleOpen}
          className={buttonClassName({ variant: 'tonal', size: 'sm', className: 'w-full whitespace-nowrap' })}
        >
          <FileTextIcon size={14} />
          Notas
        </button>
      </Tooltip>

      <Modal open={open} onClose={() => setOpen(false)} title="Notas privadas" width={560}>
        <div className="space-y-4">
          {nombrePostulante && (
            <p className="text-compact text-muted">
              Notas sobre <span className="font-semibold text-ink-soft">{nombrePostulante}</span>
            </p>
          )}

          <NotasCandidato
            postulanteId={postulanteId}
            puestoId={puestoId}
            notas={notas}
            onNotasChange={(actualizar) => setNotas((prev) => actualizar(prev ?? []))}
            cargando={cargando}
            errorCarga={errorCarga}
            listaClassName="max-h-72"
          />
        </div>
      </Modal>
    </>
  )
}
