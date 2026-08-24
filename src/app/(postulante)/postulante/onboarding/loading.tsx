import { Card, Skeleton } from '@/components/ui'
import { BrandLogo } from '@/components/shared/brand-logo'
import { SkeletonForm } from '@/components/shell/page-skeleton'

/**
 * Onboarding del postulante.
 *
 * Real: el logo, la bajada y las etiquetas de los campos.
 * Esqueleto: el título —dice "Completá tu perfil" o "Actualizá tus datos" según
 * exista perfil previo, así que no se puede anticipar— y los inputs, que
 * arrancan con el perfil y los catálogos de provincias y carreras.
 */
export default function LoadingOnboardingPostulante() {
  return (
    <div
      className="flex min-h-screen items-start justify-center bg-surface-page px-4 py-10"
      aria-busy="true"
    >
      <div className="w-full max-w-lg">
        <div className="mb-8 flex flex-col items-center gap-3">
          <BrandLogo size={48} />
          <div className="flex flex-col items-center text-center">
            <Skeleton className="h-8 w-60" />
            <p className="mt-1 text-sm text-muted">
              Necesitamos algunos datos básicos para continuar
            </p>
          </div>
        </div>

        <Card padding="lg">
          <SkeletonForm
            labels={['Nombre completo', 'Teléfono', 'LinkedIn', 'Portfolio o sitio web']}
          />
          <Skeleton className="mt-4 h-11 w-full" />
        </Card>
      </div>
    </div>
  )
}
