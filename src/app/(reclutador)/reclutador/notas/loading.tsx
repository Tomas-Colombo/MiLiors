import { SkeletonCardList, SkeletonFilters, SkeletonPageHeader } from '@/components/shell/page-skeleton'

/**
 * Mis notas.
 *
 * Real: el título.
 * Esqueleto: la bajada (total de notas), los filtros —reciben la lista de
 * candidatos con notas del server— y las tarjetas de nota.
 */
export default function LoadingNotas() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-6" aria-busy="true">
      <SkeletonPageHeader title="Mis notas" subtitleWidth="w-36" />

      <SkeletonFilters selects={2} />

      <SkeletonCardList count={4} lines={3} />
    </div>
  )
}
