import { Card, Skeleton } from '@/components/ui'
import { SkeletonPageHeader } from '@/components/shell/page-skeleton'

/**
 * Perfil técnico.
 *
 * Real: título y bajada.
 * Esqueleto: las secciones del editor. `PerfilTecnicoUI` es un client component
 * que arranca con el perfil completo y el catálogo de competencias ya cargados,
 * así que no se puede montar acá sin datos.
 */
export default function LoadingPerfilTecnico() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8" aria-busy="true">
      <div className="mb-6">
        <SkeletonPageHeader
          title="Perfil Técnico"
          titleClassName="tracking-tight"
          subtitle="Tu experiencia, formación, cursos, idiomas y habilidades y tecnologías."
          subtitleClassName="text-sm"
        />
      </div>

      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} padding="lg">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-8 w-24" />
            </div>
            <Skeleton className="mt-4 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-3/4" />
          </Card>
        ))}
      </div>
    </div>
  )
}
