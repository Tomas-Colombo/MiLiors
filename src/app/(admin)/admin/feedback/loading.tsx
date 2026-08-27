import { Card } from '@/components/ui'
import {
  SkeletonFilters,
  SkeletonInlineForm,
  SkeletonKpis,
  SkeletonPageHeader,
  SkeletonTable,
} from '@/components/shell/page-skeleton'
import { ExportarExcelSkeleton } from '@/components/shared/exportar-excel'

/**
 * Feedback del informe.
 *
 * Real: título y bajada, el panel de reactivación con su explicación, el rótulo
 * de los dos botones de export y las cabeceras de la tabla.
 *
 * Esqueleto: los 4 KPIs, el input de días —valor inicial del server—, los
 * filtros y las filas de competencias. Los export CSV se pintan como cápsulas
 * inertes: su `href` lleva los filtros vigentes, que todavía no se resolvieron,
 * y un link con la query incompleta bajaría el CSV equivocado.
 */
export default function LoadingFeedback() {
  return (
    <div className="mx-auto max-w-5xl px-8 py-10" aria-busy="true">
      <SkeletonPageHeader
        variant="admin"
        title="Feedback del informe"
        subtitle="Qué tan bien calibrado está el motor de competencias, según los propios postulantes. No modifica ningún informe: es insumo para ajustar la matriz eneatipo→competencia y el factor de contraste."
      />

      <div className="mt-8">
        <Card className="mb-6">
          <h2 className="text-[15px] font-bold text-ink">Reactivación del cuadro de opinión</h2>
          <p className="mt-1 text-[13px] text-muted">
            Cuando el postulante responde &ldquo;¿cuánto te representa este informe?&rdquo;, el cuadro
            se cierra y no vuelve a ofrecerse hasta que pase este período. Si regenera su informe se
            reabre antes: es un informe distinto.
          </p>
          <SkeletonInlineForm label="Días hasta reactivar" action="Guardar" className="mt-4" />
        </Card>
      </div>

      <SkeletonKpis count={4} columns={4} />

      <SkeletonFilters selects={3} className="mt-8" />

      <div className="mt-4">
        <ExportarExcelSkeleton nota="Cuatro hojas con lo que estos filtros dejan a la vista." />
      </div>

      <SkeletonTable
        className="mt-6"
        headers={['Competencia', 'Distribución', 'Sesgo']}
        widths={['2fr', '1.5fr']}
        rows={8}
      />
    </div>
  )
}
