import { Card } from '@/components/ui'
import {
  SkeletonFilters,
  SkeletonFiltroFechas,
  SkeletonInlineForm,
  SkeletonPageHeader,
  SkeletonTable,
} from '@/components/shell/page-skeleton'

/**
 * Listado de empresas del panel de admin.
 *
 * Real: título, el panel de "Pausa automática de puestos" con su explicación y
 * las cabeceras de la tabla.
 * Esqueleto: la bajada (arranca con el total de empresas), el input de días —su
 * valor inicial viene de `getConfiguracionSistema()`—, los filtros y las filas.
 */
export default function LoadingAdminEmpresas() {
  return (
    <div className="mx-auto max-w-5xl px-8 py-10" aria-busy="true">
      <SkeletonPageHeader variant="admin" title="Empresas" subtitleWidth="w-96" />

      <div className="mt-6">
        <Card className="mb-6">
          <h2 className="text-[15px] font-bold text-ink">Pausa automática de puestos</h2>
          <p className="mt-1 text-[13px] text-muted">
            Los puestos activos sin actividad del reclutador (revisar postulaciones, cambiar
            estados, notas o editar el puesto) durante este período se pausan automáticamente.
          </p>
          <SkeletonInlineForm label="Días de inactividad" action="Guardar" className="mt-4" />
        </Card>
      </div>

      <SkeletonFilters selects={3} className="mt-6" />

      <SkeletonFiltroFechas className="mt-3" />

      <SkeletonTable
        className="mt-4"
        headers={['Empresa', 'Estado', 'Reclutadores', 'Creada']}
        widths={['2fr']}
        rows={8}
      />
    </div>
  )
}
