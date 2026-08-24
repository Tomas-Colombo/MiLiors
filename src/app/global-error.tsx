'use client'

import { useEffect } from 'react'
import './globals.css'
import { PageState } from '@/components/shell/page-state'
import { Button } from '@/components/ui'
import { AlertTriangleIcon } from '@/components/icons'

/**
 * Último recurso: sólo entra cuando falla el propio layout raíz, y cuando entra
 * REEMPLAZA a ese layout. De ahí las dos particularidades:
 *
 *  1. Tiene que traer sus propios <html> y <body>, y su propio import de los
 *     estilos: no hereda nada.
 *  2. No corren ni las fuentes de next/font ni el script que aplica el tema, así
 *     que se pinta siempre en claro y con la tipografía de sistema (el fallback
 *     de `--font-sans`). Es aceptable en una pantalla que no debería verse.
 *
 * Como es un componente cliente no admite `export const metadata`; el título va
 * con el <title> de React.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error('[app/global-error]', error)
  }, [error])

  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full">
        <title>Error — MiLiors</title>
        <PageState
          screen
          tone="error"
          icon={<AlertTriangleIcon size={24} />}
          code="Error"
          title="La aplicación no pudo iniciarse"
          description="Ocurrió un fallo antes de poder mostrar la pantalla. Volvé a intentarlo en unos segundos."
          actions={<Button onClick={() => unstable_retry()}>Reintentar</Button>}
          detail={error.digest && `Código de referencia: ${error.digest}`}
        />
      </body>
    </html>
  )
}
