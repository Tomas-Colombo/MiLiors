'use client'

import { useState, useTransition } from 'react'
import { Modal, Button, Alert } from '@/components/ui'
import { aceptarTyC } from '@/modules/auth/actions'

type TyC = {
  id: string
  version: string
  descripcion: string
  fecha_publicacion: string
}

export function TyCModal({ tyc }: { tyc: TyC }) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAceptar() {
    startTransition(async () => {
      const result = await aceptarTyC(tyc.id)
      if (!result.success) {
        setError(result.error)
      }
      // Si success, el revalidatePath en la action recargará el Server Component
    })
  }

  return (
    <Modal
      open={true}
      onClose={() => {}} // No se puede cerrar — es bloqueante
      title={`Términos y Condiciones — v${tyc.version}`}
      footer={
        <Button
          className="w-full"
          size="lg"
          loading={isPending}
          disabled={isPending}
          onClick={handleAceptar}
        >
          {isPending ? 'Registrando aceptación...' : 'Acepto los Términos y Condiciones'}
        </Button>
      }
    >
      <div className="max-h-[50vh] overflow-y-auto text-sm leading-relaxed text-soft">
        {tyc.descripcion}
      </div>
      {error && <Alert tone="error" title={error} className="mt-3" />}
    </Modal>
  )
}
