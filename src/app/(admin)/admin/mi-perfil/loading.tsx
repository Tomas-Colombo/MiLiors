import { Card, Skeleton } from '@/components/ui'
import { SkeletonForm, SkeletonPageHeader } from '@/components/shell/page-skeleton'

/**
 * Mi cuenta (admin).
 *
 * Real: todo el andamiaje —títulos, bajadas, rótulo "Email" y las etiquetas de
 * los dos campos de contraseña—, porque nada de eso depende de la sesión.
 *
 * Esqueleto: el email (único dato que sale de `verifySession()`) y los inputs
 * de contraseña, que se remontan al llegar la page real.
 */
export default function LoadingAdminMiCuenta() {
  return (
    <div className="mx-auto max-w-xl px-6 py-10 space-y-8" aria-busy="true">
      <SkeletonPageHeader
        title="Mi cuenta"
        titleClassName="tracking-tight"
        subtitle="Gestioná los datos de tu cuenta de administrador."
        subtitleClassName="text-sm"
      />

      <div>
        <h2 className="mb-1 text-lg font-bold tracking-tight text-ink">Datos de acceso</h2>
        <Card padding="lg">
          <div className="space-y-1">
            <p className="text-[13px] font-semibold text-ink-soft">Email</p>
            <Skeleton className="h-4 w-56" />
          </div>
        </Card>
      </div>

      <div>
        <h2 className="mb-1 text-lg font-bold tracking-tight text-ink">Seguridad</h2>
        <p className="mb-4 text-sm text-muted">Cambiá tu contraseña de acceso.</p>
        <Card padding="lg">
          <SkeletonForm labels={['Nueva contraseña', 'Confirmar nueva contraseña']} />
          <Skeleton className="mt-4 h-10 w-44" />
        </Card>
      </div>
    </div>
  )
}
