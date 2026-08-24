import { getMetricas } from '@/modules/admin/queries'
import { KpiCard, Card, Badge } from '@/components/ui'
import {
  UsersIcon,
  SearchIcon,
  UserIcon,
  BuildingIcon,
  GridIcon,
  SparklesIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  AlertCircleIcon,
} from '@/components/icons'
import { QuickLinksAdmin } from './quick-links'

export const metadata = { title: 'Dashboard — Admin MiLiors' }

export default async function AdminDashboard() {
  const m = await getMetricas()

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <h1 className="text-[22px] font-extrabold tracking-tight text-ink">Dashboard</h1>
      <p className="mt-1 text-[13px] text-muted">Vista general del sistema MiLiors</p>

      {/* KPI Grid */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <KpiCard
          icon={<UsersIcon size={20} />}
          tone="violet"
          label="Total postulantes"
          value={m.totalPostulantes}
        />
        <KpiCard
          icon={<SearchIcon size={20} />}
          tone="blue"
          label="En búsqueda activa"
          value={m.postulantesBusqueda}
        />
        <KpiCard
          icon={<UserIcon size={20} />}
          tone="green"
          label="Reclutadores activos"
          value={m.totalReclutadores}
        />
        <KpiCard
          icon={<BuildingIcon size={20} />}
          tone="amber"
          label="Empresas activas"
          value={m.totalEmpresas}
        />
        <KpiCard
          icon={<GridIcon size={20} />}
          tone="violet"
          label="Puestos publicados"
          value={m.puestosActivos}
        />
        <KpiCard
          icon={<SparklesIcon size={20} />}
          tone="blue"
          label="Consultas IA este mes"
          value={m.consultasIAEsteMes}
        />
      </div>

      {/* Estado de informes */}
      <h2 className="mt-10 text-[15px] font-bold text-ink">Estado de informes</h2>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <Card padding="md" className="flex items-center gap-4">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-success-bg text-success">
            <CheckCircleIcon size={20} />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Listos</p>
            <p className="text-[24px] font-extrabold text-ink">{m.informesListo}</p>
          </div>
          <Badge tone="success" className="ml-auto">LISTO</Badge>
        </Card>

        <Card padding="md" className="flex items-center gap-4">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-warning-bg text-warning">
            <AlertTriangleIcon size={20} />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Pendientes</p>
            <p className="text-[24px] font-extrabold text-ink">{m.informesPendiente}</p>
          </div>
          <Badge tone="warning" className="ml-auto">PENDIENTE</Badge>
        </Card>

        <Card padding="md" className="flex items-center gap-4">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-error-bg text-error">
            <AlertCircleIcon size={20} />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">En error</p>
            <p className="text-[24px] font-extrabold text-ink">{m.informesError}</p>
          </div>
          <Badge tone="error" className="ml-auto">ERROR</Badge>
        </Card>
      </div>

      {/* Quick links */}
      <h2 className="mt-10 text-[15px] font-bold text-ink">Accesos rápidos</h2>
      <QuickLinksAdmin />

      {/* Stats footer */}
      <div className="mt-10 flex items-center gap-6 text-[12px] text-neutral-400">
        <span>Puestos pausados: <strong className="text-ink-soft">{m.puestosCerrados}</strong></span>
      </div>
    </div>
  )
}
