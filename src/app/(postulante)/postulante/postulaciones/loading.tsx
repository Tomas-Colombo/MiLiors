import { Card, Skeleton } from '@/components/ui'
import { SkeletonFilters, SkeletonPageHeader } from '@/components/shell/page-skeleton'

/**
 * Mis postulaciones.
 *
 * Real: el título.
 * Esqueleto: el contador de postulaciones, los filtros y las tarjetas. Cada
 * tarjeta replica la fila real —título, empresa y fecha a la izquierda; estado
 * y acción a la derecha— para que no salte nada al llegar los datos.
 */
export default function LoadingMisPostulaciones() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-6" aria-busy="true">
      <SkeletonPageHeader title="Mis postulaciones" subtitleWidth="w-32" />

      <SkeletonFilters selects={2} />

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} padding="md">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-56" />
                <Skeleton className="h-3 w-40" />
                <Skeleton className="h-3 w-48" />
              </div>
              <div className="flex flex-none items-center gap-4">
                <Skeleton className="h-6 w-24" borderRadius={999} />
                <Skeleton className="h-8 w-8" borderRadius={999} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
