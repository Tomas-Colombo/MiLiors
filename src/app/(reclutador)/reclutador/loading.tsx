import { Skeleton } from '@/components/ui'
import { QuickLinksReclutador } from './quick-links'
import { MetricasSkeleton } from './metricas-skeleton'

/**
 * Dashboard de reclutador.
 *
 * Real: los rótulos "Accesos rápidos" y "Métricas" y toda la grilla de accesos
 * rápidos, que son links estáticos: el usuario puede irse a Mis puestos sin
 * esperar a que resuelva el perfil.
 *
 * Esqueleto: el saludo (lleva el nombre del reclutador), la bajada (nombre de
 * la empresa o cantidad de empresas activas) y el bloque de métricas, para el
 * que se reusa el mismo fallback que ya usa el `<Suspense>` de la page.
 */
export default function LoadingReclutadorDashboard() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-8" aria-busy="true">
      <div>
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-2 h-4 w-40" />
      </div>

      <div>
        <h2 className="text-[13.5px] font-bold text-ink mb-3">Accesos rápidos</h2>
        <QuickLinksReclutador />
      </div>

      <div>
        <h2 className="text-[13.5px] font-bold text-ink mb-3">Métricas</h2>
        <MetricasSkeleton />
      </div>
    </div>
  )
}
