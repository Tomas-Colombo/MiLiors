import { Skeleton } from '@/components/ui'
import { SkeletonFilters, SkeletonPageHeader } from '@/components/shell/page-skeleton'

/**
 * Buscar postulantes: grilla de tarjetas de candidato de 3 columnas.
 *
 * Real: el título.
 * Esqueleto: la bajada (candidatos en búsqueda activa), los filtros —reciben
 * competencias, provincias, departamentos y carreras del server— y las
 * tarjetas, con la misma grilla `sm:grid-cols-2 lg:grid-cols-3` de la page.
 */
export default function LoadingBuscarPostulantes() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-6" aria-busy="true">
      <SkeletonPageHeader title="Buscar postulantes" subtitleWidth="w-60" />

      <SkeletonFilters selects={3} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-surface p-[22px] shadow-card">
            <div className="space-y-3">
              <div>
                <Skeleton className="h-4 w-36" />
                <Skeleton className="mt-1.5 h-3 w-28" />
                <Skeleton className="mt-1.5 h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-12" borderRadius={999} />
              <div className="flex flex-wrap gap-1.5">
                <Skeleton className="h-5 w-16" borderRadius={999} />
                <Skeleton className="h-5 w-20" borderRadius={999} />
                <Skeleton className="h-5 w-14" borderRadius={999} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
