import { Card } from '@/components/ui'
import { ChevronLeftIcon } from '@/components/icons'
import { SkeletonForm, SkeletonPageHeader } from '@/components/shell/page-skeleton'

/**
 * Editar puesto.
 *
 * Real: título, bajada y las etiquetas de los campos. El "Volver al detalle" va
 * a esqueleto porque su href lleva el id del puesto, que se resuelve con los
 * params de la ruta recién en la page.
 *
 * Esqueleto: los inputs, que arrancan con los valores actuales del puesto.
 */
export default function LoadingEditarPuesto() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-6" aria-busy="true">
      <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
        <ChevronLeftIcon size={16} />
        Volver al detalle
      </span>

      <SkeletonPageHeader title="Editar puesto" subtitle="Actualizá la información del puesto." />

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
