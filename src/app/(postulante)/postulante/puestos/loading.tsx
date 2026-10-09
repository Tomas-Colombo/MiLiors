import { Card, Skeleton } from '@/components/ui'
import { SkeletonCardList, SkeletonPageHeader } from '@/components/shell/page-skeleton'

/**
 * Buscar puestos.
 *
 * Real: el título.
 * Esqueleto: la cantidad de resultados, el panel de filtros —`PuestosFilters`
 * recibe sectores, provincias, departamentos y carreras del server— y las
 * tarjetas de puesto. El bloque de filtros conserva el alto de 36 (h-36) que ya
 * usa el fallback del `<Suspense>` de la page, para no mover nada al entrar.
 */
export default function LoadingBuscarPuestos() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10 space-y-6" aria-busy="true">
      <SkeletonPageHeader title="Buscar puestos" subtitleWidth="w-28" />

      <Card padding="lg">
        <Skeleton className="h-36 w-full" borderRadius={8} />
      </Card>

      <SkeletonCardList count={5} lines={2} />
    </div>
  )
}
