import { Card, PageHeader } from '@/components/ui'
import { BuildingIcon } from '@/components/icons'
import { OnboardingEmpresaForm } from './onboarding-form'

export const metadata = { title: 'Configurar empresa — MiLiors' }

export default async function OnboardingReclutadorPage() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10 space-y-6">
      <PageHeader
        icon={<BuildingIcon size={22} />}
        title="Configurá tu primera empresa"
        description='Los puestos se publican a nombre de una empresa. Después vas a poder agregar más desde "Mis empresas".'
      />

      <Card>
        <OnboardingEmpresaForm />
      </Card>
    </div>
  )
}
