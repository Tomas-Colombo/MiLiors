'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { PageState } from '@/components/shell/page-state'
import { Button, buttonClassName } from '@/components/ui'
import { AlertTriangleIcon } from '@/components/icons'

/**
 * Límite de error de este grupo. Al estar dentro del layout, el fallo de una
 * pantalla no se lleva puesta la barra lateral: se puede reintentar o irse a
 * otra sección sin recargar.
 *
 * En producción `error.message` llega genérico para no filtrar detalles del
 * server; el que sirve para rastrear el fallo en el log es `digest`.
 */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error('[reclutador/error]', error)
  }, [error])

  return (
    <PageState
      tone="error"
      icon={<AlertTriangleIcon size={24} />}
      code="Error"
      title="No pudimos cargar esta pantalla"
      description="Volvé a intentarlo; si sigue fallando, escribinos con el código de abajo."
      actions={
        <>
          <Button onClick={() => unstable_retry()}>Reintentar</Button>
          <Link href="/reclutador" className={buttonClassName({ variant: 'secondary' })}>
            Volver al inicio
          </Link>
        </>
      }
      detail={error.digest && `Código de referencia: ${error.digest}`}
    />
  )
}
