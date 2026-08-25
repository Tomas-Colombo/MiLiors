import Link from 'next/link'
import { Skeleton } from '@/components/ui'
import { ChevronLeftIcon, SparklesIcon } from '@/components/icons'

/**
 * Asistente IA de un puesto.
 *
 * Real: el "Volver a mis puestos" (href fijo), el ícono y el título "Asistente
 * IA", más el arranque de la bajada.
 * Esqueleto: el nombre del puesto dentro de la bajada y la lista de candidatos,
 * que `AsistenteCandidatos` recibe ya resuelta del server.
 */
export default function LoadingAsistentePuesto() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-6" aria-busy="true">
      <Link
        href="/reclutador/puestos"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted transition-colors hover:text-ink"
      >
        <ChevronLeftIcon size={16} />
        Volver a mis puestos
      </Link>

      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary-tint text-primary-600">
          <SparklesIcon size={22} />
        </span>
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Asistente IA</h1>
          <p className="flex items-center gap-1.5 text-[13px] text-muted">
            Candidatos marcados para avanzar en <Skeleton inline className="h-3 w-40" />
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-surface p-[22px] shadow-card">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="mt-2 h-3 w-64" />
          </div>
        ))}
      </div>
    </div>
  )
}
