import { Skeleton } from '@/components/ui'
import { MESES_ESPERA_REHACER } from '@/modules/eneagrama/rehacer-policy'

/**
 * Eneagrama + Human Design.
 *
 * Real: los dos encabezados de sección con sus bajadas y la tarjeta completa
 * "¿Qué es el Eneagrama?" —es texto fijo y el período de espera sale de una
 * constante del módulo, no de la base—. Es la parte que más se lee de la
 * pantalla, así que llega de entrada.
 *
 * Esqueleto: el bloque de resultado (tipo dominante, fortalezas, entorno) y el
 * formulario de Human Design, que arranca con la carta ya guardada.
 */
export default function LoadingHumanDesign() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-10" aria-busy="true">
      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Eneagrama</h1>
          <p className="mt-1 text-sm text-muted">
            Tu tipo de personalidad según el sistema ITA Riso-Hudson.
          </p>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-surface px-5 py-4 shadow-card">
          <p className="text-sm font-semibold text-ink">¿Qué es el Eneagrama?</p>
          <p className="mt-1 text-sm text-muted leading-relaxed">
            Es un modelo que agrupa la personalidad en 9 patrones según qué te motiva a la hora de
            trabajar y decidir. En MiLiors lo usamos para traducir ese resultado a información
            laboral concreta: en qué aportás valor, en qué contextos rendís mejor y qué conviene
            desarrollar.
          </p>
          <p className="mt-2 text-xs text-muted">
            El resultado refleja tu momento actual: se puede rehacer cada {MESES_ESPERA_REHACER} meses.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-l-4 border-neutral-200 border-l-primary-600 bg-surface shadow-card">
          <div className="flex items-center justify-between gap-4 bg-primary-tint px-5 py-4">
            <div>
              <Skeleton className="h-3 w-28" />
              <Skeleton className="mt-1.5 h-5 w-56" />
            </div>
            <Skeleton className="h-9 w-32" borderRadius={8} />
          </div>
          <div className="space-y-4 px-5 py-4">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-11/12" />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="mb-2 h-3 w-28" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="mt-1.5 h-3 w-4/5" />
                  <Skeleton className="mt-1.5 h-3 w-3/4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <hr className="border-neutral-200" />

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink">Human Design</h2>
          <p className="mt-1 text-sm text-muted">
            Tu carta de Human Design enriquece el informe combinado de personalidad.
          </p>
        </div>
        <Skeleton className="h-64 w-full" borderRadius={12} />
      </section>
    </div>
  )
}
