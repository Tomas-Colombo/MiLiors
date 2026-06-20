import { verifySession } from '@/lib/dal'
import { requireEneagramaCompleto } from '@/lib/guards'
import { TyCGate } from '@/components/shared/tyc-gate'
import { getHumanDesign } from '@/modules/human-design/queries'
import { HumanDesignForm } from './human-design-form'

export const metadata = { title: 'Human Design — TalentID' }

export default async function HumanDesignPage() {
  await verifySession()
  await requireEneagramaCompleto()
  const hd = await getHumanDesign()

  return (
    <TyCGate>
      <div className="mx-auto max-w-xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Human Design</h1>
          <p className="mt-1 text-sm text-muted">
            Opcional. Completá tu carta si ya la conocés. Enriquece tu informe de personalidad.
          </p>
        </div>
        <HumanDesignForm hd={hd} />
      </div>
    </TyCGate>
  )
}
