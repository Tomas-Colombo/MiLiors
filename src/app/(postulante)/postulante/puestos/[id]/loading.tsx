import { Card, Skeleton } from '@/components/ui'
import { ChevronLeftIcon } from '@/components/icons'

/**
 * Detalle de un puesto (vista del postulante).
 *
 * Esqueleto casi completo: el link de volver cambia de destino según se venga
 * de "Buscar puestos" o de "Mis postulaciones" (`?volver=`), y el resto —título,
 * empresa, descripción, requisitos y el botón de postularse, que depende de si
 * ya se postuló y de si tiene certificado vigente— sale todo de las queries del
 * puesto. Se reserva la silueta de la tarjeta para que no salte el layout.
 */
export default function LoadingDetallePuestoPostulante() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10 space-y-6" aria-busy="true">
      <span className="inline-flex items-center gap-1.5 text-sm text-muted">
        <ChevronLeftIcon size={15} />
        Volver
      </span>

      <Card padding="lg" className="space-y-5">
        <div className="space-y-3">
          <Skeleton className="h-6 w-4/5" />
          <Skeleton className="h-4 w-44" />
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-9 w-52" borderRadius={8} />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>

        <div className="space-y-2 border-t border-neutral-100 pt-5">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-neutral-100 pt-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-1.5 h-3.5 w-28" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
