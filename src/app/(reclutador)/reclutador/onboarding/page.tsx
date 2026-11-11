import { redirect } from 'next/navigation'
import { Card, PageHeader } from '@/components/ui'
import { BuildingIcon } from '@/components/icons'
import { OnboardingEmpresaForm } from './onboarding-form'
import { getMisEmpresasBase } from '@/modules/empresas/queries'

export const metadata = { title: 'Configurar empresa — MiLiors' }

export default async function OnboardingReclutadorPage() {
  // El onboarding es para la primera empresa: las siguientes se cargan desde
  // "Mis empresas". Lectura memoizada, ya la hizo el layout en este render.
  const empresas = await getMisEmpresasBase()
  if (empresas.length > 0) {
    redirect('/reclutador/puestos')
  }

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
