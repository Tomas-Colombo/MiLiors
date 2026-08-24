import {
  SkeletonFilters,
  SkeletonInlineForm,
  SkeletonPageHeader,
  SkeletonTable,
} from '@/components/shell/page-skeleton'
import { Skeleton } from '@/components/ui'

/**
 * Ubicaciones: provincias arriba, departamentos de la provincia elegida en el
 * medio y localidades del departamento elegido abajo. Las tres secciones tienen
 * la misma estructura (alta + filtros + tabla paginada).
 *
 * Real: los tres títulos de sección con sus bajadas, las etiquetas de alta y
 * las cabeceras de las tablas.
 * Esqueleto: los inputs de alta, los selectores en cascada (client components
 * que arrancan con el valor de `searchParams`), los filtros y las filas.
 */
export default function LoadingUbicaciones() {
  return (
    <div className="mx-auto max-w-4xl px-8 py-10" aria-busy="true">
      <SkeletonPageHeader
        variant="admin"
        title="Ubicaciones"
        subtitle="Provincias, departamentos y localidades de Argentina. Cada nivel cuelga del anterior. Los inactivos se conservan como baja lógica y dejan de aparecer en los selectores."
      />

      <h2 className="mt-8 text-[15px] font-bold text-ink">Provincias</h2>

      <div className="mt-3 rounded-xl border border-neutral-200 bg-surface p-6 shadow-card">
        <SkeletonInlineForm label="Nueva provincia" />
      </div>

      <SkeletonFilters selects={2} className="mt-6" />

      <SkeletonTable
        className="mt-4"
        headers={['Provincia', 'Estado', 'Creada', '']}
        widths={['2fr']}
        rows={8}
      />

      <h2 className="mt-10 text-[15px] font-bold text-ink">Departamentos</h2>
      <p className="mt-1 text-[13px] text-muted">
        Elegí una provincia para ver y gestionar sus departamentos.
      </p>

      <Skeleton className="mt-3 h-10 w-full sm:w-64" />

      <div className="mt-4 rounded-xl border border-neutral-200 bg-surface p-6 shadow-card">
        <SkeletonInlineForm label="Nuevo departamento" />
      </div>

      <SkeletonFilters selects={2} className="mt-6" />

      <SkeletonTable
        className="mt-4"
        headers={['Departamento', 'Estado', 'Creado', '']}
        widths={['2fr']}
        rows={6}
      />

      <h2 className="mt-10 text-[15px] font-bold text-ink">Localidades</h2>
      <p className="mt-1 text-[13px] text-muted">
        Elegí un departamento para ver y gestionar sus localidades.
      </p>

      <Skeleton className="mt-3 h-10 w-full sm:w-64" />

      <div className="mt-4 rounded-xl border border-neutral-200 bg-surface p-6 shadow-card">
        <SkeletonInlineForm label="Nueva localidad" />
      </div>

      <SkeletonFilters selects={2} className="mt-6" />

      <SkeletonTable
        className="mt-4"
        headers={['Localidad', 'Estado', 'Creada', '']}
        widths={['2fr']}
        rows={6}
      />
    </div>
  )
}
