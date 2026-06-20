import { verifySession } from '@/lib/dal'
import { requireEneagramaCompleto } from '@/lib/guards'
import { TyCGate } from '@/components/shared/tyc-gate'

export const metadata = { title: 'Mi perfil — TalentID' }

export default async function PostulanteDashboard() {
  const session = await verifySession()
  await requireEneagramaCompleto()

  return (
    <TyCGate>
      <div className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-extrabold text-ink">Dashboard del Postulante</h1>
        <p className="mt-2 text-muted">Hola, {session.email}</p>
        <p className="mt-4 text-sm text-faint">Fase 3 — Perfil Técnico (próximamente)</p>
      </div>
    </TyCGate>
  )
}
