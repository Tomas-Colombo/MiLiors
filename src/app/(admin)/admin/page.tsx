import { verifySession } from '@/lib/dal'

export const metadata = { title: 'Admin — TalentID' }

export default async function AdminDashboard() {
  const session = await verifySession()

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-extrabold text-ink">Panel de Administración</h1>
      <p className="mt-2 text-muted">{session.email}</p>
      <p className="mt-4 text-sm text-faint">Fase 8 — Métricas y gestión (próximamente)</p>
    </div>
  )
}
