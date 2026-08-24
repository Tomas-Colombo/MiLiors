import { SkeletonFilters, SkeletonFiltroFechas, SkeletonPageHeader, SkeletonTable } from '@/components/shell/page-skeleton'

/**
 * Monitor de informes.
 *
 * Real: título y cabeceras de la tabla.
 * Esqueleto: la bajada (arranca con el total de informes), el bloque de filtros
 * —client component que recibe los totales del server— y las filas.
 */
export default function LoadingInformes() {
  return (
    <div className="mx-auto max-w-5xl px-8 py-10" aria-busy="true">
      <SkeletonPageHeader variant="admin" title="Monitor de informes" subtitleWidth="w-[26rem]" />

      <SkeletonFilters selects={2} className="mt-6" />

      <SkeletonFiltroFechas className="mt-3" />

      <SkeletonTable
        className="mt-6"
        headers={['Postulante', 'Estado', 'Generado', 'Últ. actualización']}
        widths={['2fr']}
        rows={8}
      />
    </div>
  )
}
