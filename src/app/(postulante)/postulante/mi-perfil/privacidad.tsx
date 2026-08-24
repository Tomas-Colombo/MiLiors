'use client'

import { useState, useTransition } from 'react'
import { Alert } from '@/components/ui'
import { actualizarVisibilidadPersonalidad } from '@/modules/perfil/actions'

/**
 * Control de visibilidad del informe de personalidad en la verificación
 * pública del certificado. Viene encendido: el certificado circula para que lo
 * miren, y lo que se ve al escanearlo es lo que despierta interés.
 */
export function PrivacidadPersonalidad({ inicial }: { inicial: boolean }) {
  const [visible, setVisible] = useState(inicial)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function toggle() {
    const siguiente = !visible
    setVisible(siguiente)
    setError(null)
    startTransition(async () => {
      const result = await actualizarVisibilidadPersonalidad(siguiente)
      if (!result.success) {
        setVisible(!siguiente) // revertir: la preferencia no llegó a guardarse
        setError(result.error)
      }
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[14px] font-semibold text-ink">Mostrar mi informe de personalidad</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
            Quien escanee el QR de tu certificado —o ingrese su ID en la web— ve tu informe de
            personalidad. Nunca se muestran tu email, tu teléfono ni tu LinkedIn.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={visible}
          aria-label="Mostrar mi informe de personalidad en la verificación pública"
          onClick={toggle}
          disabled={isPending}
          className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors disabled:opacity-60 ${
            visible ? 'bg-primary-600' : 'bg-neutral-300'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${
              visible ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      {!visible && (
        <p className="text-[12.5px] text-muted">
          Tu certificado sigue siendo verificable: quien lo consulte va a ver tu nombre y la fecha
          de emisión, pero no tu personalidad.
        </p>
      )}

      {error && <Alert tone="error" title={error} />}
    </div>
  )
}
