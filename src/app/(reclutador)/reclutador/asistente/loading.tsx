import { Skeleton } from '@/components/ui'
import { SparklesIcon } from '@/components/icons'

/**
 * Asistente IA (entrada general).
 *
 * Real: todo el encabezado —ícono, título y explicación son fijos—.
 * Esqueleto: el chat, porque `AsistenteChat` es un client component que arranca
 * con la lista de puestos, el postulante y la postulación ya resueltos en el
 * server; montarlo vacío mostraría un selector sin opciones.
 */
export default function LoadingAsistente() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10 space-y-6" aria-busy="true">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-tint text-primary-600">
          <SparklesIcon size={22} />
        </span>
        <div>
          <h1 className="text-balance text-2xl font-extrabold leading-tight tracking-tight text-ink">Asistente IA</h1>
          <p className="text-compact text-muted">
            Consultá la compatibilidad candidato-puesto usando el Eneagrama.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-surface p-[22px] shadow-card">
        <Skeleton className="h-10 w-full sm:w-72" />
        <Skeleton className="mt-4 h-64 w-full" />
        <Skeleton className="mt-4 h-11 w-full" />
      </div>
    </div>
  )
}
