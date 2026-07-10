import { Card, Skeleton } from '@/components/ui'

/** Fallback de <Suspense> mientras se resuelven las métricas del dashboard. */
export function MetricasSkeleton() {
  return (
    <div className="space-y-5">
      {/* Bloque 1 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} padding="md" className="h-full">
            <Skeleton className="h-8 w-14" />
            <Skeleton className="mt-3 h-3.5 w-24" />
            <Skeleton className="mt-2 h-3 w-full" />
          </Card>
        ))}
      </div>

      {/* Recuadro — métricas por puesto */}
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 sm:p-4 space-y-4">
        <div className="flex items-center justify-between px-1 pt-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-10 w-56" />
        </div>
        <Card padding="lg">
          <div className="mb-5 flex items-center justify-between">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-10 w-40" />
          </div>
          <Skeleton className="h-[200px] w-full" />
        </Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} padding="lg">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="mt-3 h-10 w-24" />
              <Skeleton className="mt-4 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-4/5" />
            </Card>
          ))}
        </div>
      </div>

      {/* Promedio por puesto */}
      <Card padding="lg">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="mt-3 h-10 w-24" />
        <Skeleton className="mt-4 h-3 w-full" />
        <Skeleton className="mt-2 h-3 w-4/5" />
      </Card>
    </div>
  )
}
