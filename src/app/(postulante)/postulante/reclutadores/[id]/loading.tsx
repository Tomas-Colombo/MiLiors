import Link from 'next/link'
import { Card, Skeleton } from '@/components/ui'
import { BuildingIcon, ChevronLeftIcon, UserIcon } from '@/components/icons'

/**
 * Perfil público de un reclutador.
 *
 * Real: el "Buscar puestos" de volver (href fijo) y los marcos con sus íconos.
 * Esqueleto: el nombre del reclutador, cuántas empresas representa y la lista
 * de empresas con su descripción, que salen todos de la misma query por id.
 */
export default function LoadingPerfilReclutador() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10 space-y-6" aria-busy="true">
      <Link
        href="/postulante/puestos"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <ChevronLeftIcon size={15} />
        Buscar puestos
      </Link>

      <Card padding="lg">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-tint text-primary-600">
            <UserIcon size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <Skeleton className="h-6 w-52" />
            <Skeleton className="mt-2 h-4 w-40" />
          </div>
        </div>

        <div className="mt-5 space-y-4 border-t border-neutral-100 pt-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-tint text-primary-600">
                <BuildingIcon size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="mt-1.5 h-3 w-full" />
                <Skeleton className="mt-1.5 h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
