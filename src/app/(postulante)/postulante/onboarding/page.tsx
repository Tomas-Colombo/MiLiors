import { verifySession } from '@/lib/dal'
import { getPerfilPostulante } from '@/modules/eneagrama/queries'
import { getProvincias, getUbicacionInicial } from '@/modules/ubicacion/queries'
import { getCarreras } from '@/modules/carreras/queries'
import { OnboardingForm } from './onboarding-form'
import { BrandLogo } from '@/components/shared/brand-logo'

export const metadata = { title: 'Datos básicos — MiLiors' }

export default async function OnboardingPage() {
  await verifySession()
  const perfil = await getPerfilPostulante()
  const provincias = await getProvincias()
  const carreras = await getCarreras()
  const ubicacionInicial = await getUbicacionInicial(perfil?.localidad_id, perfil?.provincia_id)

  return (
    <div className="flex min-h-screen items-start justify-center bg-surface-page px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex flex-col items-center gap-3">
          <BrandLogo size={48} />
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
          carreras={carreras}
          ubicacionInicial={ubicacionInicial}
        />
      </div>
    </div>
  )
}
