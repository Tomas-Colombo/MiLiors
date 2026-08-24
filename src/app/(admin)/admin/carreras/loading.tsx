import {
  SkeletonFilters,
  SkeletonInlineForm,
  SkeletonPageHeader,
  SkeletonTable,
} from '@/components/shell/page-skeleton'

/**
 * Carreras: dos bloques (catálogo oficial + valores libres cargados por
 * postulantes), cada uno con sus propios filtros y su tabla.
 *
 * Real: los dos títulos de sección con sus bajadas, la etiqueta del alta y las
 * cabeceras de ambas tablas.
 * Esqueleto: el input de alta, los dos juegos de filtros y las filas.
 */
export default function LoadingCarreras() {
  return (
    <div className="mx-auto max-w-4xl px-8 py-10" aria-busy="true">
      <SkeletonPageHeader
        variant="admin"
        title="Carreras"
        subtitle="Catálogo oficial de carreras y valores de texto libre cargados por postulantes."
      />

      <h2 className="mt-8 text-[15px] font-bold text-ink">Carreras oficiales</h2>

      <div className="mt-3 rounded-xl border border-neutral-200 bg-surface p-6 shadow-card">
        <SkeletonInlineForm label="Nueva carrera" />
      </div>

      <SkeletonFilters selects={2} className="mt-6" />

      <SkeletonTable
        className="mt-4"
        headers={['Nombre', 'Estado', 'Creada', '']}
        widths={['2fr']}
        rows={8}
      />

      <h2 className="mt-10 text-[15px] font-bold text-ink">Cargadas por postulantes (Otras)</h2>
      <p className="mt-1 text-[13px] text-muted">
        Valores de texto libre que los postulantes cargaron cuando su carrera no estaba en el catálogo.
      </p>

      <SkeletonFilters selects={2} className="mt-3 sm:items-end" />

      <SkeletonTable
        className="mt-4"
        headers={['Título', 'Postulantes', 'Primera vez cargada', '']}
        widths={['2fr']}
        rows={5}
      />
    </div>
  )
}
