import { Skeleton } from '@/components/ui'
import { QuickLinksPostulante } from './quick-links'

/**
 * Home del postulante.
 *
 * Real: el rótulo "Visibilidad en búsquedas" y la tarjeta completa de accesos
 * rápidos —son links estáticos, así que el postulante puede irse a su perfil o
 * a buscar puestos sin esperar al eneagrama.
 *
 * Esqueleto: el saludo (lleva su nombre), el switch de visibilidad (arranca con
 * el valor guardado) y toda la tarjeta de perfil profesional, que se arma con
 * el resultado del test.
 */
export default function LoadingPostulanteHome() {
  return (
    <div className="min-h-screen px-8 py-10" style={{ background: 'var(--color-page)' }} aria-busy="true">
      <div className="mb-8">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-2 h-4 w-56" />
      </div>

      <div className="flex flex-wrap items-start gap-6 lg:flex-nowrap">
        <div className="min-w-0 flex-1">
          <div
            className="rounded-[14px] bg-surface p-8"
            style={{ border: '1px solid var(--color-border-soft)' }}
          >
            <Skeleton className="h-3 w-40" />
            <Skeleton className="mt-2 h-7 w-3/4" />
            <Skeleton className="mt-2 h-3 w-64" />

            <div className="mt-4 space-y-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-4/5" />
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-[10px] px-4 py-3.5"
                  style={{
                    background: 'var(--color-page)',
                    border: '1px solid var(--color-border-soft)',
                  }}
                >
                  <Skeleton className="mb-1.5 h-3 w-28" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="mt-1.5 h-3 w-2/3" />
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Skeleton className="h-10 w-60" borderRadius={8} />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </div>

        <div className="flex w-full flex-none flex-col gap-4 lg:w-72 xl:w-80">
          <div
            className="rounded-[14px] bg-surface px-5 py-4"
            style={{ border: '1px solid var(--color-border-soft)' }}
          >
            <h2
              className="mb-3 text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: 'var(--color-accent-violet)' }}
            >
              Visibilidad en búsquedas
            </h2>
            <Skeleton className="h-10 w-full" />
          </div>

          <QuickLinksPostulante />
        </div>
      </div>
    </div>
  )
}
