import { SkeletonFilters, SkeletonFiltroFechas, SkeletonPageHeader, SkeletonTable } from '@/components/shell/page-skeleton'

/**
 * Listado de postulantes del panel de admin.
 *
 * Real: título y cabeceras de la tabla.
 * Esqueleto: la bajada (arranca con el total de registros), los filtros y las
 * filas.
 */
export default function LoadingAdminPostulantes() {
  return (
    <div className="mx-auto max-w-6xl px-8 py-10" aria-busy="true">
      <SkeletonPageHeader variant="admin" title="Postulantes" subtitleWidth="w-80" />

      <SkeletonFilters selects={6} className="mt-6" />

      <SkeletonFiltroFechas className="mt-3" />

      <SkeletonTable
        className="mt-4"
        headers={['Nombre', 'Carrera', 'Ubicación', 'Eneagrama', 'Informe', 'En búsqueda', 'Registro', '']}
        widths={['1.8fr']}
        rows={8}
      />
    </div>
  )
}
