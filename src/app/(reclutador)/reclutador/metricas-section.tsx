import Link from 'next/link'
import { Card, EmptyState } from '@/components/ui'
import { BarChartIcon, PlusIcon } from '@/components/icons'
import { getDashboardMetrics } from '@/modules/dashboard/queries'
import { MetricasCliente } from './metricas-cliente'

const LABEL = '#8B86A8'
const HINT = '#b3aec2'
const ALERT = '#E24B4A'

/** Card compacta de métrica rápida (Bloque 1). */
function QuickMetric({
  value,
  label,
  hint,
  alert,
}: {
  value: number
  label: string
  hint: string
  alert?: boolean
}) {
  return (
    <Card padding="md" className="h-full">
      <p
        className="font-heading text-[32px] font-semibold leading-none"
        style={{ color: alert ? ALERT : 'var(--color-ink)' }}
      >
        {value}
      </p>
      <p className="mt-2 text-[13px] font-medium" style={{ color: LABEL }}>
        {label}
      </p>
      <p className="mt-1 text-[12px] leading-snug" style={{ color: HINT }}>
        {hint}
      </p>
    </Card>
  )
}

/**
 * Sección de métricas del dashboard. Async server component: se resuelve dentro
 * de un <Suspense> para mostrar un skeleton mientras Supabase responde.
 */
export async function MetricasSection() {
  const m = await getDashboardMetrics()

  if (!m.hasActivePuestos) {
    return (
      <Card padding="lg">
        <EmptyState
          icon={<BarChartIcon size={22} />}
          title="Todavía no hay estadísticas"
          description="Publicá tu primer puesto para empezar a ver estadísticas."
          action={
            <Link
              href="/reclutador/puestos/nuevo"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-600 px-[18px] text-sm font-semibold text-white hover:brightness-105"
            >
              <PlusIcon size={16} />
              Publicar puesto
            </Link>
          }
        />
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      {/* Bloque 1 — Métricas rápidas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <QuickMetric
          value={m.puestosActivos}
          label="Puestos activos"
          hint="Tus búsquedas abiertas actualmente."
        />
        <QuickMetric
          value={m.postulacionesRecibidas}
          label="Postulaciones recibidas"
          hint="Total acumulado desde que empezaste a usar MiLiors."
        />
        <QuickMetric
          value={m.candidatosSinAccion}
          label="Candidatos sin acción"
          hint="Postulaciones que todavía no evaluaste."
          alert={m.candidatosSinAccion > 0}
        />
      </div>

      {/* Bloques 2 y 3 — interactivos */}
      <MetricasCliente metrics={m} />
    </div>
  )
}
