import Link from 'next/link'
import { Card, Skeleton } from '@/components/ui'
import { SkeletonForm, SkeletonPageHeader } from '@/components/shell/page-skeleton'

/**
 * Mi perfil (reclutador).
 *
 * Real: títulos, bajadas —incluido el link a "Mis empresas"— y las etiquetas de
 * los tres campos, porque no dependen de ninguna query.
 * Esqueleto: los inputs (el nombre llega precargado del server) y el bloque
 * legal, que sólo se pinta si hay TyC vigentes.
 */
export default function LoadingReclutadorMiPerfil() {
  return (
    <div className="mx-auto max-w-xl px-6 py-10 space-y-6" aria-busy="true">
      <SkeletonPageHeader
        title="Mi perfil"
        titleClassName="tracking-tight"
        subtitleClassName="text-sm"
        subtitle={
          <>
            Actualizá tus datos. Las empresas se administran en{' '}
            <Link href="/reclutador/empresas" className="font-medium text-primary-600 hover:underline">
              Mis empresas
            </Link>
            .
          </>
        }
      />

      <Card padding="lg">
        <SkeletonForm labels={['Tu nombre']} />
        <Skeleton className="mt-4 h-10 w-36" />
      </Card>

      <div>
        <h2 className="mb-1 text-lg font-bold tracking-tight text-ink">Seguridad</h2>
        <p className="mb-4 text-sm text-muted">Cambiá tu contraseña de acceso.</p>
        <Card padding="lg">
          <SkeletonForm labels={['Nueva contraseña', 'Confirmar nueva contraseña']} />
          <Skeleton className="mt-4 h-10 w-44" />
        </Card>
      </div>
    </div>
  )
}
