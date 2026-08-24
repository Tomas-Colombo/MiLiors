import Link from 'next/link'
import { Card, Skeleton } from '@/components/ui'
import { BuildingIcon, ChevronLeftIcon, UsersIcon } from '@/components/icons'

/**
 * Detalle de un puesto.
 *
 * Real: el "Volver a mis puestos" (href fijo, navegable ya), los títulos de las
 * tarjetas ("Descripción", "Detalles") y los rótulos de la lista de detalles —
 * carga horaria, modalidad, ubicación, idioma y nivel—, que son fijos.
 *
 * Esqueleto: todo lo que sale de la query del puesto (título, empresa, estado,
 * fecha, contador de postulaciones y los valores del `<dl>`). El botón "Editar"
 * también, porque su href lleva el id que recién se resuelve en la page.
 */
export default function LoadingDetallePuesto() {
  const detalles = ['Carga horaria', 'Modalidad', 'Ubicación', 'Idioma', 'Nivel de experiencia']

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-6" aria-busy="true">
      <Link
        href="/reclutador/puestos"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink"
      >
        <ChevronLeftIcon size={16} />
        Volver a mis puestos
      </Link>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-[11px] bg-primary-tint text-primary-600">
                <BuildingIcon size={22} />
              </span>
              <div>
                <Skeleton className="h-6 w-64" />
                <Skeleton className="mt-1.5 h-3 w-44" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-20" borderRadius={999} />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
      </Card>

      <Card padding="md">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[10px] bg-primary-tint text-primary-600">
            <UsersIcon size={20} />
          </span>
          <div>
            <Skeleton className="h-5 w-10" />
            <p className="mt-1 text-[12.5px] text-muted">Postulaciones recibidas en total</p>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-[14px] font-bold text-ink">Descripción</h2>
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-[14px] font-bold text-ink">Detalles</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
          {detalles.map((label) => (
            <div key={label}>
              <dt className="text-muted">{label}</dt>
              <dd className="mt-1">
                <Skeleton className="h-3.5 w-28" />
              </dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  )
}
