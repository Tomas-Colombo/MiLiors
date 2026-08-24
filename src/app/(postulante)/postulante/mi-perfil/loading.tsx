import { Card, Skeleton } from '@/components/ui'
import { SkeletonForm, SkeletonPageHeader } from '@/components/shell/page-skeleton'

/**
 * Mi perfil (postulante).
 *
 * Real: títulos, bajadas y las etiquetas de todos los campos — el andamiaje no
 * depende de ninguna query.
 * Esqueleto: los inputs (llegan precargados con el perfil, el email de la
 * sesión y los catálogos de provincias y carreras) y el bloque legal, que sólo
 * aparece si hay TyC vigentes.
 */
export default function LoadingPostulanteMiPerfil() {
  return (
    <div className="mx-auto max-w-xl px-6 py-10 space-y-8" aria-busy="true">
      <SkeletonPageHeader
        title="Mi perfil"
        titleClassName="tracking-tight"
        subtitle="Actualizá tus datos básicos de contacto."
        subtitleClassName="text-sm"
      />

      <Card padding="lg">
        <SkeletonForm
          labels={['Email', 'Nombre completo', 'Teléfono', 'LinkedIn', 'Portfolio o sitio web']}
        />
        <Skeleton className="mt-4 h-10 w-36" />
      </Card>

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
