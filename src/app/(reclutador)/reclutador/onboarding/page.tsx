import { Card } from '@/components/ui'
import { BuildingIcon } from '@/components/icons'
import { OnboardingEmpresaForm } from './onboarding-form'

export const metadata = { title: 'Configurar empresa — MiLiors' }

export default async function OnboardingReclutadorPage() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10 space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-tint text-primary-600">
          <BuildingIcon size={22} />
        </div>
        <div>
          <h1 className="text-balance text-2xl font-extrabold leading-tight tracking-tight text-ink">Configurá tu primera empresa</h1>
          <p className="text-compact text-muted">
            Los puestos se publican a nombre de una empresa. Después vas a poder agregar más desde
            &quot;Mis empresas&quot;.
          </p>
        </div>
      </div>

      <Card>
        <OnboardingEmpresaForm />
      </Card>
    </div>
  )
}
