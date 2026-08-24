import Link from 'next/link'
import { PlusIcon } from '@/components/icons'
import {
  SkeletonFilters,
  SkeletonPageHeader,
  SkeletonTable,
} from '@/components/shell/page-skeleton'

/**
 * Mis puestos.
 *
 * Real: título y el botón "Nuevo puesto" —es un link estático, así que se puede
 * clickear mientras carga la tabla— y las cabeceras de columna.
 *
 * Esqueleto: la bajada (cantidad de puestos), los filtros (client component que
 * recibe las empresas del server) y las filas. Los anchos replican los de la
 * tabla real para que las columnas no se muevan al entrar el contenido.
 */
export default function LoadingMisPuestos() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-6" aria-busy="true">
      <SkeletonPageHeader
        title="Mis puestos"
        subtitleWidth="w-28"
        action={
          <Link
            href="/reclutador/puestos/nuevo"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-600 px-[18px] text-sm font-semibold text-white hover:brightness-105"
          >
            <PlusIcon size={16} />
            Nuevo puesto
          </Link>
        }
      />

      <SkeletonFilters selects={3} />

      <SkeletonTable
        headers={['Título', 'Estado', 'Apertura', 'Pausado', 'Acciones']}
        widths={['2fr', '1.5fr', '1fr', '1fr', '380px']}
        rows={6}
      />
    </div>
  )
}
