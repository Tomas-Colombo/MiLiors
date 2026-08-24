import {
  SkeletonFilters,
  SkeletonFiltroFechas,
  SkeletonInlineForm,
  SkeletonPageHeader,
  SkeletonTable,
} from '@/components/shell/page-skeleton'

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

      <SkeletonTable
        className="mt-4"
        headers={['Nombre', 'Estado', 'Creada', '']}
        widths={['2fr']}
        rows={8}
      />
    </div>
  )
}
