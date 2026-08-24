import Link from 'next/link'
import { Skeleton } from '@/components/ui'
import { BackButton } from './back-button'
import { BrandLogo } from '@/components/shared/brand-logo'

/**
 * Verificación pública de un certificado.
 *
 * Real: todo el marco de la página —textura, marca de agua, cabecera con logo,
 * botón de volver y el toggle de tema—, que no depende del certificado.
 *
 * Esqueleto: sólo el interior de la tarjeta. No se anticipa ni el ícono ni el
 * texto: la misma tarjeta sirve para "verificado" y para "inválido", y mostrar
 * un tilde verde que después pasa a error sería peor que no mostrar nada.
 */
export default function LoadingVerificar() {
  return (
    <div className="vf-page" aria-busy="true">
      <div className="vf-texture" />
      <div className="vf-watermark">MiLiors</div>

      <header className="vf-header">
        <BackButton />
        <Link href="/" className="vf-logo">
          <BrandLogo size={26} className="vf-logo-mark" />
          MiLiors
        </Link>
      </header>

      <main className="vf-main">
        <div className="vf-card-wrap">
          <div className="vf-card">
            <div className="flex flex-col items-center gap-4">
              <Skeleton className="h-[60px] w-[60px]" borderRadius={999} />
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3.5 w-56" />
              <Skeleton className="mt-2 h-3 w-40" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
