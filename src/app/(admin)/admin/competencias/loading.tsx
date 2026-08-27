import {
  SkeletonFilters,
  SkeletonFiltroFechas,
  SkeletonInlineForm,
  SkeletonPageHeader,
  SkeletonTable,
} from '@/components/shell/page-skeleton'
import { ExportarExcelSkeleton } from '@/components/shared/exportar-excel'

/**
 * ABM de habilidades y tecnologías.
 *
 * Real: título, bajada, etiqueta del alta y cabeceras de tabla.
 * Esqueleto: input de alta, filtros (leen `searchParams`) y filas.
 */
export default function LoadingCompetencias() {
  return (
    <div className="mx-auto max-w-4xl px-8 py-10" aria-busy="true">
      <SkeletonPageHeader
        variant="admin"
        title="Habilidades y tecnologías"
        subtitle="Las habilidades/tecnologías inactivas se conservan como baja lógica y no se eliminan."
      />

      <div className="mt-8 rounded-xl border border-neutral-200 bg-surface p-6 shadow-card">
        <SkeletonInlineForm label="Nueva habilidad/tecnología" />
      </div>

      <SkeletonFilters selects={2} className="mt-6" />

      <SkeletonFiltroFechas className="mt-3" />

      <div className="mt-4">
        <ExportarExcelSkeleton nota="Dos hojas: catálogo y uso por postulantes, con los filtros aplicados." />
      </div>

      <SkeletonTable
        className="mt-4"
        headers={['Nombre', 'Estado', 'Creada', '']}
        widths={['2fr']}
        rows={8}
      />

      <h2 className="mt-10 text-[15px] font-bold text-ink">Cargadas por postulantes</h2>

      <SkeletonTable
        className="mt-4"
        headers={['Habilidad / tecnología', 'Postulantes', 'Nivel declarado', 'Alta en catálogo']}
        widths={['2fr']}
        rows={6}
      />
    </div>
  )
}
