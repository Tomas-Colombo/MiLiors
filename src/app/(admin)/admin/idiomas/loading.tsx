import {
  SkeletonFilters,
  SkeletonInlineForm,
  SkeletonPageHeader,
  SkeletonTable,
} from '@/components/shell/page-skeleton'
import { ExportarExcelSkeleton } from '@/components/shared/exportar-excel'

/**
 * ABM de idiomas.
 *
 * Real: título, bajada, etiqueta del alta y cabeceras de tabla.
 * Esqueleto: input de alta, filtros (leen `searchParams`) y filas.
 */
export default function LoadingIdiomas() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10" aria-busy="true">
      <SkeletonPageHeader
        title="Idiomas"
        subtitle="Los idiomas inactivos se conservan como baja lógica y no se eliminan."
      />

      <div className="mt-8 rounded-xl border border-neutral-200 bg-surface p-6 shadow-card">
        <SkeletonInlineForm label="Nuevo idioma" />
      </div>

      <SkeletonFilters selects={2} className="mt-6" />

      <div className="mt-4">
        <ExportarExcelSkeleton />
      </div>

      <SkeletonTable
        className="mt-4"
        headers={['Nombre', 'Estado', 'Creado', '']}
        widths={['2fr']}
        rows={8}
      />
    </div>
  )
}
