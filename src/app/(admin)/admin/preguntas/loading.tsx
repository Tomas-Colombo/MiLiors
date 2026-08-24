import { Skeleton } from '@/components/ui'
import { SkeletonPageHeader, SkeletonTable } from '@/components/shell/page-skeleton'

/**
 * Banco de preguntas del eneagrama.
 *
 * Real: título y las cabeceras de la tabla (el filtro por defecto es "activas",
 * así que sus columnas se conocen de antemano).
 * Esqueleto: la bajada —los tres contadores salen de la query—, el botón de
 * alta y el switch de filtro (client components), el buscador y las filas.
 */
export default function LoadingPreguntas() {
  return (
    <div className="mx-auto max-w-5xl px-8 py-10" aria-busy="true">
      <SkeletonPageHeader
        variant="admin"
        title="Preguntas del eneagrama"
        subtitleWidth="w-72"
        action={<Skeleton className="h-10 w-36" />}
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-10 w-full sm:w-64" />
        <Skeleton className="h-10 w-full sm:w-72" />
      </div>

      <SkeletonTable
        className="mt-4"
        headers={['#', 'Enunciado', 'Eneatipo', 'Activa', '']}
        widths={['52px', '3fr', '90px', '70px', '80px']}
        rows={8}
      />
    </div>
  )
}
