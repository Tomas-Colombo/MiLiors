'use client'

import { useState } from 'react'
import { Modal, Button } from '@/components/ui'
import { ShieldIcon } from '@/components/icons'

type TyC = {
  id: string
  version: string
  descripcion: string
  fecha_publicacion: string
}

/**
 * Acceso directo de solo lectura a los Términos y Condiciones vigentes.
 * Se muestra en la configuración de reclutador y postulante.
 */
export function TyCLector({ tyc }: { tyc: TyC }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-surface px-5 py-4 text-left shadow-card transition-colors hover:border-primary-300 hover:bg-primary-ghost-hover"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] bg-primary-tint text-primary-600">
            <ShieldIcon size={18} />
          </span>
          <span>
            <span className="block text-[13.5px] font-semibold text-ink group-hover:text-primary-600">
              Términos y Condiciones
            </span>
            <span className="block text-[12px] text-muted">Leé los términos vigentes (v{tyc.version})</span>
          </span>
        </span>
        <span className="text-[12px] font-medium text-primary-600">Leer</span>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Términos y Condiciones — v${tyc.version}`}
        width={640}
        footer={
          <Button className="w-full" variant="secondary" onClick={() => setOpen(false)}>
            Cerrar
          </Button>
        }
      >
        <div className="max-h-[55vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-soft">
          {tyc.descripcion}
        </div>
      </Modal>
    </>
  )
}
