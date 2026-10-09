import { Skeleton } from '@/components/ui'
import { SkeletonPageHeader } from '@/components/shell/page-skeleton'

/**
 * Términos y Condiciones.
 *
 * Real: título, bajada y los rótulos de las dos pestañas.
 * Esqueleto: el contador de versiones del historial y el cuerpo de la pestaña
 * —`TyCAdmin` es un client component que arranca en "Publicar nueva versión"
 * con las versiones ya cargadas del server, así que no se puede montar acá.
 */
export default function LoadingTyC() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10" aria-busy="true">
      <SkeletonPageHeader
        title="Términos y Condiciones"
        subtitle="Publicá nuevas versiones de los Términos y Condiciones y consultá el historial de cambios."
      />

      <div className="mt-6 flex gap-1 border-b border-neutral-200">
        <span className="-mb-px border-b-2 border-primary-600 px-4 py-2.5 text-compact font-semibold text-primary-600">
          Publicar nueva versión
        </span>
        <span className="-mb-px flex items-center gap-1.5 border-b-2 border-transparent px-4 py-2.5 text-compact font-semibold text-muted">
          Historial <Skeleton inline className="h-3 w-6" />
        </span>
      </div>

      <div className="mt-6 space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-10 w-40" />
      </div>
    </div>
  )
}
