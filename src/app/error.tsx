'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { PageState } from '@/components/shell/page-state'
import { Button, buttonClassName } from '@/components/ui'
import { AlertTriangleIcon } from '@/components/icons'

/**
 * Límite de error de la raíz. Atrapa lo que revienta fuera de los grupos
 * autenticados y, sobre todo, lo que revienta en los layouts de esos grupos
 * (`error.tsx` no envuelve al `layout.tsx` de su mismo segmento, así que un
 * fallo de `(postulante)/layout.tsx` sube hasta acá).
 *
 * En producción `error.message` viene genérico a propósito, para no filtrar
 * detalles del server: lo que sirve para rastrear el fallo es `digest`, que
 * casa con la línea del log del servidor. Por eso se muestra.
 */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error('[app/error]', error)
  }, [error])

  return (
    <PageState
      screen
      tone="error"
      icon={<AlertTriangleIcon size={24} />}
      code="Error"
      title="Algo salió mal"
      description="No pudimos cargar esta pantalla. Volvé a intentarlo; si sigue fallando, escribinos con el código de abajo."
      actions={
        <>
          <Button onClick={() => unstable_retry()}>Reintentar</Button>
          <Link href="/" className={buttonClassName({ variant: 'secondary' })}>
            Ir al inicio
          </Link>
        </>
      }
      detail={error.digest && `Código de referencia: ${error.digest}`}
    />
  )
}
