import {
  SkeletonFilters,
  SkeletonFiltroFechas,
  SkeletonInlineForm,
  SkeletonPageHeader,
  SkeletonTable,
} from '@/components/shell/page-skeleton'

/**
 * ABM de sectores.
 *
 * Real: título, bajada, la etiqueta del alta y las cabeceras de la tabla — nada
 * de eso sale de `getSectoresAdmin()`.
 *
 * Esqueleto: el input de alta (el formulario se remonta al llegar la page real,
 * y perder lo tipeado sería peor que un placeholder), los filtros —client
 * components que derivan su estado de `searchParams`— y las filas.
 */
export default function LoadingSectores() {
  return (
    <div className="mx-auto max-w-4xl px-8 py-10" aria-busy="true">
      <SkeletonPageHeader
        variant="admin"
        title="Sectores industriales"
        subtitle="Los sectores inactivos se conservan como baja lógica y no se eliminan."
      />

      <div className="mt-8 rounded-xl border border-neutral-200 bg-surface p-6 shadow-card">
        <SkeletonInlineForm label="Nuevo sector" />
      </div>

      <SkeletonFilters selects={2} className="mt-6" />

      <SkeletonFiltroFechas className="mt-3" />

      <SkeletonTable
        className="mt-4"
        headers={['Nombre', 'Estado', 'Creado', '']}
        widths={['2fr']}
        rows={8}
      />
    </div>
  )
}
