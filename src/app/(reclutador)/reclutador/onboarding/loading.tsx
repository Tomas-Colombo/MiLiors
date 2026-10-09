import { Card } from '@/components/ui'
import { BuildingIcon } from '@/components/icons'
import { SkeletonForm } from '@/components/shell/page-skeleton'

/**
 * Onboarding: alta de la primera empresa.
 *
 * Real: el encabezado completo y las tres etiquetas del formulario — la
 * pantalla no muestra ningún dato del server, sólo espera a `verifySession()`.
 * Esqueleto: los inputs, que se remontan cuando entra la page real.
 */
export default function LoadingOnboardingReclutador() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10 space-y-6" aria-busy="true">
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
        <SkeletonForm labels={['Nombre de la empresa', 'Descripción', 'Sitio web']} />
      </Card>
    </div>
  )
}
