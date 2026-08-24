import { Card, Badge, Skeleton } from '@/components/ui'
import { CheckCircleIcon, AlertTriangleIcon, AlertCircleIcon } from '@/components/icons'
import { SkeletonKpis, SkeletonPageHeader } from '@/components/shell/page-skeleton'
import { QuickLinksAdmin } from './quick-links'

/**
 * Dashboard de admin.
 *
 * Real: título y bajada, los tres rótulos e íconos de "Estado de informes" y la
 * grilla completa de accesos rápidos (son links estáticos, así que el usuario
 * puede navegar sin esperar a `getMetricas()`).
 *
 * Esqueleto: los 6 KPIs, los tres contadores de informes y el pie de "puestos
 * pausados" — todos números que salen de la misma query.
 */
export default function LoadingAdminDashboard() {
  const estados = [
    { label: 'Listos', icon: <CheckCircleIcon size={20} />, tone: 'success' as const, badge: 'LISTO', bg: 'bg-success-bg text-success' },
    { label: 'Pendientes', icon: <AlertTriangleIcon size={20} />, tone: 'warning' as const, badge: 'PENDIENTE', bg: 'bg-warning-bg text-warning' },
    { label: 'En error', icon: <AlertCircleIcon size={20} />, tone: 'error' as const, badge: 'ERROR', bg: 'bg-error-bg text-error' },
  ]

  return (
    <div className="mx-auto max-w-5xl px-8 py-10" aria-busy="true">
      <SkeletonPageHeader
        variant="admin"
        title="Dashboard"
        subtitle="Vista general del sistema MiLiors"
      />

      <SkeletonKpis count={6} columns={3} className="mt-8" />

      <h2 className="mt-10 text-[15px] font-bold text-ink">Estado de informes</h2>
      <div className="mt-4 grid grid-cols-3 gap-4">
        {estados.map(e => (
          <Card key={e.label} padding="md" className="flex items-center gap-4">
            <span className={`flex h-10 w-10 flex-none items-center justify-center rounded-[10px] ${e.bg}`}>
              {e.icon}
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{e.label}</p>
              <Skeleton className="mt-1 h-6 w-10" />
            </div>
            <Badge tone={e.tone} className="ml-auto">{e.badge}</Badge>
          </Card>
        ))}
      </div>

      <h2 className="mt-10 text-[15px] font-bold text-ink">Accesos rápidos</h2>
      <QuickLinksAdmin />

      <div className="mt-10 flex items-center gap-6 text-[12px] text-neutral-400">
        <span className="flex items-center gap-2">
          Puestos pausados: <Skeleton className="h-3 w-8" />
        </span>
      </div>
    </div>
  )
}
