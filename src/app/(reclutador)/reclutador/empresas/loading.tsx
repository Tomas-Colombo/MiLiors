import { Skeleton } from '@/components/ui'
import {
  SkeletonFilters,
  SkeletonPageHeader,
  SkeletonTable,
} from '@/components/shell/page-skeleton'

/**
 * Mis empresas.
 *
 * Real: título y cabeceras de la tabla.
 * Esqueleto: la bajada (empresas / puestos / postulaciones activas), el botón de
 * alta —client component con modal—, los filtros y las filas.
 */
export default function LoadingReclutadorEmpresas() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-6" aria-busy="true">
      <SkeletonPageHeader
        title="Mis empresas"
        subtitleWidth="w-80"
        action={<Skeleton className="h-10 w-40" />}
      />

      <SkeletonFilters selects={2} />

      <SkeletonTable
        headers={['Empresa', 'Estado', 'Puestos activos', 'Postulaciones activas', 'Acciones']}
        widths={['2fr', '1fr', '1fr', '1fr', '320px']}
        rows={6}
      />
    </div>
  )
}
