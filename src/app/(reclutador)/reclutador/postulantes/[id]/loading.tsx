import { Card, Skeleton } from '@/components/ui'
import { ChevronLeftIcon, UserIcon } from '@/components/icons'

/**
 * Perfil de un candidato.
 *
 * Real: los títulos de las tarjetas que siempre están ("Formación académica",
 * "Experiencia laboral") y la grilla de dos columnas.
 *
 * Esqueleto: el link de volver —su destino depende de dónde venga el reclutador
 * (`?volver=`), que se resuelve en la page—, el nombre, carrera, ubicación,
 * eneatipo, competencias y todo el contenido de las tarjetas. Las secciones
 * condicionales (Human Design, preselector, cursos) no se pintan: mostrar una
 * tarjeta que después puede no existir sería peor que no mostrarla.
 */
export default function LoadingPerfilCandidato() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-6" aria-busy="true">
      <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
        <ChevronLeftIcon size={16} />
        Volver
      </span>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-tint text-primary-600">
                <UserIcon size={22} />
              </span>
              <div>
                <Skeleton className="h-6 w-56" />
                <Skeleton className="mt-1.5 h-3 w-40" />
                <Skeleton className="mt-1.5 h-3 w-32" />
              </div>
            </div>
            <Skeleton className="h-6 w-44" borderRadius={999} />
            <div className="flex flex-wrap gap-1.5">
              <Skeleton className="h-5 w-20" borderRadius={999} />
              <Skeleton className="h-5 w-24" borderRadius={999} />
              <Skeleton className="h-5 w-16" borderRadius={999} />
            </div>
          </div>
          <Skeleton className="h-10 w-52" />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {['Formación académica', 'Experiencia laboral'].map((titulo) => (
            <Card key={titulo}>
              <h2 className="mb-3 text-[14px] font-bold text-ink">{titulo}</h2>
              <ul className="space-y-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <li key={i}>
                    <Skeleton className="h-3.5 w-48" />
                    <Skeleton className="mt-1.5 h-3 w-36" />
                    <Skeleton className="mt-1.5 h-3 w-24" />
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <Card>
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="mt-3 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-4/5" />
          </Card>
        </div>
      </div>
    </div>
  )
}
