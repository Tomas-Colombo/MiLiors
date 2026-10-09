import { SkeletonCardList, SkeletonFilters, SkeletonPageHeader } from '@/components/shell/page-skeleton'

/**
 * Postulaciones recibidas.
 *
 * Real: sólo el título; el resto de la pantalla depende de los datos.
 * Esqueleto: la bajada (cantidad de postulaciones y, si hay filtro, el título
 * del puesto), el bloque de filtros —recibe puestos, empresas, carreras,
 * habilidades y ubicaciones del server— y las tarjetas de candidato.
 */
export default function LoadingPostulacionesRecibidas() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10 space-y-6" aria-busy="true">
      <SkeletonPageHeader title="Postulaciones recibidas" subtitleWidth="w-64" />

      <SkeletonFilters selects={3} />

      <SkeletonCardList count={5} lines={2} />
    </div>
  )
}
