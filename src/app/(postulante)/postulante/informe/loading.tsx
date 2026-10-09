import { Card, Skeleton } from '@/components/ui'
import { SkeletonPageHeader, SkeletonText } from '@/components/shell/page-skeleton'

/**
 * Informe de personalidad.
 *
 * Real: título y bajada.
 * Esqueleto: el visor. El informe puede estar listo, pendiente o en error, así
 * que no se anticipa ninguna sección concreta: sólo bloques de texto neutros
 * con la misma tarjeta y ancho que usa `InformeVisor`.
 */
export default function LoadingInforme() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10" aria-busy="true">
      <div className="mb-6">
        <SkeletonPageHeader
          title="Informe de Personalidad"
          subtitle="Generado a partir de tu Eneagrama."
        />
      </div>

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} padding="lg">
            <Skeleton className="h-4 w-40" />
            <SkeletonText lines={4} className="mt-3" />
          </Card>
        ))}
      </div>
    </div>
  )
}
