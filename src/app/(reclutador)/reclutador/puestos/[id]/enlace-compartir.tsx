'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Button, ConfirmDialog, inputClassName } from '@/components/ui'
import { CheckIcon } from '@/components/icons'
import { regenerarEnlacePuesto } from '@/modules/puestos/actions'

type Props = {
  puestoId: string
  /** Token vigente del link. */
  token: string
  /** Base absoluta de la app, resuelta en el servidor (sin barra final). */
  baseUrl: string
}

/** Link de solo lectura con "Copiar link" y "Regenerar link" (con confirmación). */
export function EnlaceCompartir({ puestoId, token: tokenInicial, baseUrl }: Props) {
  const [token, setToken] = useState(tokenInicial)
  const [copiado, setCopiado] = useState(false)
  const [errorCopiar, setErrorCopiar] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [errorRegenerar, setErrorRegenerar] = useState<string | undefined>()
  const [regenerando, iniciarRegeneracion] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (temporizador.current) clearTimeout(temporizador.current) }, [])

  const url = `${baseUrl}/empleos/${token}`

  async function copiar() {
    let ok = false
    try {
      await navigator.clipboard.writeText(url)
      ok = true
    } catch {
      // Clipboard API bloqueada (permisos o contexto no seguro): selección + execCommand.
      const input = inputRef.current
      if (input) {
        input.select()
        ok = document.execCommand('copy')
      }
    }
    if (!ok) {
      setErrorCopiar(true)
      return
    }
    setErrorCopiar(false)
    setCopiado(true)
    if (temporizador.current) clearTimeout(temporizador.current)
    temporizador.current = setTimeout(() => setCopiado(false), 2000)
  }

  function regenerar() {
    setErrorRegenerar(undefined)
    iniciarRegeneracion(async () => {
      const res = await regenerarEnlacePuesto(puestoId)
      if (res.success) {
        setToken(res.data.token)
        setCopiado(false)
        setConfirmando(false)
      } else {
        setErrorRegenerar(res.error)
      }
    })
  }

  return (
    <>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={inputRef}
          type="text"
          readOnly
          value={url}
          aria-label="Link para compartir el puesto"
          onFocus={(e) => e.currentTarget.select()}
          className={inputClassName({ className: 'min-w-0 flex-1 font-mono text-xs' })}
        />
        <Button
          type="button"
          variant="secondary"
          className="shrink-0"
          leftIcon={copiado ? <CheckIcon size={16} /> : undefined}
          onClick={copiar}
        >
          {copiado ? 'Link copiado' : 'Copiar link'}
        </Button>
      </div>
      {/* Aviso accesible del feedback visual del botón */}
      <span className="sr-only" role="status">{copiado ? 'Link copiado' : ''}</span>
      {errorCopiar && (
        <p role="alert" className="mt-2 text-compact text-error-ink">
          No se pudo copiar. Seleccioná el link y copialo manualmente.
        </p>
      )}

      <button
        type="button"
        onClick={() => {
          setErrorRegenerar(undefined)
          setConfirmando(true)
        }}
        className="mt-3 text-compact font-medium text-muted underline-offset-2 transition-colors hover:text-ink hover:underline"
      >
        Regenerar link
      </button>

      <ConfirmDialog
        open={confirmando}
        onClose={() => setConfirmando(false)}
        onConfirm={regenerar}
        title="¿Regenerar el link?"
        confirmLabel="Regenerar link"
        tone="destructive"
        loading={regenerando}
        error={errorRegenerar}
      >
        El link actual va a dejar de funcionar. Quienes ya se postularon conservan su postulación.
      </ConfirmDialog>
    </>
  )
}
