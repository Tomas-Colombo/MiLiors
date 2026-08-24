import { Skeleton } from '@/components/ui'

/**
 * Test de eneagrama.
 *
 * La page es sólo el wizard: no hay título ni chrome propio que se pueda pintar
 * real, porque `EneagramaWizard` arranca con las preguntas, las opciones y las
 * respuestas ya guardadas. Se reserva el mismo lienzo (`bg-surface-page`) y la
 * silueta de una tarjeta de pregunta con sus cinco opciones.
 */
export default function LoadingEneagrama() {
  return (
    <div className="min-h-screen bg-surface-page" aria-busy="true">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Skeleton className="h-2 w-full" borderRadius={999} />

        <div className="mt-8 rounded-xl border border-neutral-200 bg-surface p-8 shadow-card">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-6 w-full" />
          <Skeleton className="mt-2 h-6 w-3/4" />

          <div className="mt-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" borderRadius={10} />
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
    </div>
  )
}
