import { Card } from '@/components/ui'
import { SkeletonForm, SkeletonPageHeader } from '@/components/shell/page-skeleton'

/**
 * Publicar nuevo puesto.
 *
 * Real: título, bajada y las etiquetas de los campos.
 * Esqueleto: los controles. Los selectores de empresa, sector, carreras e
 * idioma se llenan con catálogos que trae el server, así que montarlos vacíos
 * mostraría desplegables sin opciones.
 */
export default function LoadingNuevoPuesto() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-6" aria-busy="true">
      <SkeletonPageHeader
        title="Publicar nuevo puesto"
        subtitle="Completá la información para que los postulantes puedan encontrarte."
      />

      <Card>
        <SkeletonForm
          labels={[
            'Empresa',
            'Título del puesto',
            'Descripción',
            'Sector',
            'Carreras (opcional)',
            'Idioma (opcional)',
            'Carga horaria',
            'Modalidad',
            'Nivel de experiencia',
          ]}
        />
      </Card>
    </div>
  )
}
