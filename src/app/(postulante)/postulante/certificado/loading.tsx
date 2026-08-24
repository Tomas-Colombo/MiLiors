import { Card, Skeleton } from '@/components/ui'
import { SkeletonPageHeader } from '@/components/shell/page-skeleton'

/**
 * Certificado de perfil.
 *
 * Real: título y bajada.
 * Esqueleto: la tarjeta del certificado. `CertificadoUI` cambia por completo
 * según haya certificado, esté desactualizado o falten requisitos (informe,
 * formación, competencias), así que acá sólo se reserva el espacio.
 */
export default function LoadingCertificado() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8" aria-busy="true">
      <div className="mb-6">
        <SkeletonPageHeader
          title="Certificado de Perfil"
          titleClassName="tracking-tight"
          subtitle="Descargá tu certificado verificable con QR para compartir con reclutadores."
          subtitleClassName="text-sm"
        />
      </div>

      <Card padding="lg">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="mt-3 h-3 w-full" />
        <Skeleton className="mt-2 h-3 w-3/4" />
        <Skeleton className="mt-6 h-40 w-full" />
        <Skeleton className="mt-6 h-11 w-52" />
      </Card>
    </div>
  )
}
