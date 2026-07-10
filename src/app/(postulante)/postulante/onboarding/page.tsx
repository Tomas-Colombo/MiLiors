import { verifySession } from '@/lib/dal'
import { getPerfilPostulante } from '@/modules/eneagrama/queries'
import { getProvincias, getLocalidadesPorProvincia } from '@/modules/ubicacion/queries'
import { OnboardingForm } from './onboarding-form'
import { SparklesIcon } from '@/components/icons'

export const metadata = { title: 'Datos básicos — TalentID' }

export default async function OnboardingPage() {
  await verifySession()
  const perfil = await getPerfilPostulante()
  const provincias = await getProvincias()
  const localidadesIniciales = perfil?.provincia_id
    ? await getLocalidadesPorProvincia(perfil.provincia_id)
    : []

  return (
    <div className="flex min-h-screen items-start justify-center bg-surface-page px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-[14px] shadow-primary"
            style={{ background: 'var(--gradient-brand-soft)' }}
          >
            <SparklesIcon size={24} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink">
              {perfil ? 'Actualizá tus datos' : 'Completá tu perfil'}
            </h1>
            <p className="mt-1 text-sm text-muted">
              Necesitamos algunos datos básicos para continuar
            </p>
          </div>
        </div>
        <OnboardingForm
          perfil={perfil}
          provincias={provincias}
          localidadesIniciales={localidadesIniciales}
        />
      </div>
    </div>
  )
}
