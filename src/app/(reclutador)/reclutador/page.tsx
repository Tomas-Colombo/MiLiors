import { verifySession } from '@/lib/dal'
import { TyCGate } from '@/components/shared/tyc-gate'

export const metadata = { title: 'Dashboard — TalentID' }

export default async function ReclutadorDashboard() {
  const session = await verifySession()

  return (
    <TyCGate>
      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-extrabold text-ink">Dashboard del Reclutador</h1>
        <p className="mt-2 text-muted">Hola, {session.email}</p>
        <p className="mt-4 text-sm text-faint">Fase 3 — Onboarding de empresa (próximamente)</p>
      </div>
    </TyCGate>
  )
}
