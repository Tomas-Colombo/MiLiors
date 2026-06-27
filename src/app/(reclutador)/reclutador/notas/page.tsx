import Link from 'next/link'
import { TyCGate } from '@/components/shared/tyc-gate'
import { Card, Badge, CountBadge, EmptyState } from '@/components/ui'
import { NotebookIcon } from '@/components/icons'
import { getTodasLasNotasReclutador } from '@/modules/postulantes/queries'
import { groupNotesByCandidate } from '@/modules/postulantes/notas-view'

export const metadata = { title: 'Mis notas — TalentID' }

type SearchParams = Promise<{ candidato?: string; agrupar?: string }>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MisNotasPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const candidatoFiltro = sp.candidato
  const agrupar = sp.agrupar === 'candidato'

  // Fetch all notes (unfiltered) to populate the candidate dropdown
  const todasLasNotas = await getTodasLasNotasReclutador()

  // Derive distinct candidates from all notes for the filter dropdown
  const candidatosConNotas = Array.from(
    new Map(
      todasLasNotas.map((n) => [
        n.postulante_id,
        { id: n.postulante_id, nombre: n.nombre_completo ?? 'Candidato eliminado' },
      ])
    ).values()
  ).sort((a, b) => a.nombre.localeCompare(b.nombre))

  // Apply candidate filter if set
  const notas = candidatoFiltro
    ? todasLasNotas.filter((n) => n.postulante_id === candidatoFiltro)
    : todasLasNotas

  return (
    <TyCGate>
      <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Mis notas</h1>
          <p className="mt-1 text-muted text-sm">
            {todasLasNotas.length} nota{todasLasNotas.length !== 1 ? 's' : ''} en total
          </p>
        </div>

        {/* Filter form — pure GET, no JS required */}
        <form method="GET" action="" className="flex flex-wrap gap-3">
          {/* Candidate filter */}
          <div className="flex-1 min-w-[200px]">
            <select
              name="candidato"
              defaultValue={candidatoFiltro ?? ''}
              className="h-10 w-full cursor-pointer appearance-none rounded-md border border-neutral-300 bg-surface pl-3.5 pr-10 font-sans text-sm outline-none transition-[border,box-shadow] focus:border-[1.5px] focus:border-primary-600 focus:ring-[3px] focus:ring-primary-50 text-ink"
            >
              <option value="">Todos los candidatos</option>
              {candidatosConNotas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Group-by filter */}
          <div className="min-w-[160px]">
            <select
              name="agrupar"
              defaultValue={sp.agrupar ?? ''}
              className="h-10 w-full cursor-pointer appearance-none rounded-md border border-neutral-300 bg-surface pl-3.5 pr-10 font-sans text-sm outline-none transition-[border,box-shadow] focus:border-[1.5px] focus:border-primary-600 focus:ring-[3px] focus:ring-primary-50 text-ink"
            >
              <option value="">Por fecha</option>
              <option value="candidato">Por candidato</option>
            </select>
          </div>

          <button
            type="submit"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-600 px-5 text-sm font-semibold text-white hover:brightness-105"
          >
            Filtrar
          </button>

          {candidatoFiltro && (
            <Link
              href={agrupar ? '/reclutador/notas?agrupar=candidato' : '/reclutador/notas'}
              className="inline-flex h-10 items-center rounded-md border border-neutral-300 bg-surface px-4 text-sm font-medium text-ink-soft hover:bg-neutral-50"
            >
              Limpiar filtro
            </Link>
          )}
        </form>

        {/* Results */}
        {notas.length === 0 ? (
          <EmptyState
            icon={<NotebookIcon size={24} />}
            title="Sin notas aún"
            description="No hay notas privadas para mostrar. Visitá el perfil de un candidato para agregar una."
            action={
              <Link
                href="/reclutador/postulantes"
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary-600 px-4 text-sm font-semibold text-white hover:brightness-105"
              >
                Buscar candidatos
              </Link>
            }
          />
        ) : agrupar ? (
          /* Grouped view */
          <GroupedNotasView notas={notas} />
        ) : (
          /* Flat list */
          <div className="space-y-4">
            {notas.map((nota) => (
              <NotaCard key={nota.id} nota={nota} />
            ))}
          </div>
        )}
      </div>
    </TyCGate>
  )
}

// ─── Note card ────────────────────────────────────────────────────────────────

function NotaCard({
  nota,
}: {
  nota: {
    id: string
    contenido: string
    fecha_creacion: string
    titulo_puesto: string | null
    postulante_id: string
    nombre_completo: string | null
  }
}) {
  const candidatoNombre = nota.nombre_completo ?? 'Candidato eliminado'
  const isDeleted = nota.nombre_completo === null

  return (
    <Card>
      <div className="space-y-3">
        {/* Candidate link + job badge */}
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/reclutador/postulantes/${nota.postulante_id}`}
            className={`text-[15px] font-semibold hover:underline ${
              isDeleted ? 'text-muted' : 'text-primary-600'
            }`}
          >
            {candidatoNombre}
          </Link>
          {nota.titulo_puesto && (
            <Badge tone="neutral" className="flex-none">
              {nota.titulo_puesto}
            </Badge>
          )}
        </div>

        {/* Note content */}
        <p className="text-sm text-ink leading-relaxed whitespace-pre-line">
          {nota.contenido}
        </p>

        {/* Date */}
        <p className="text-xs text-muted">{formatFecha(nota.fecha_creacion)}</p>
      </div>
    </Card>
  )
}

// ─── Grouped view ─────────────────────────────────────────────────────────────

function GroupedNotasView({
  notas,
}: {
  notas: Awaited<ReturnType<typeof getTodasLasNotasReclutador>>
}) {
  const grupos = groupNotesByCandidate(notas)

  // Sort candidates by most recent note date descending
  const candidatosSorted = Object.entries(grupos).sort(([, aNotas], [, bNotas]) => {
    const aDate = aNotas[0]?.fecha_creacion ?? ''
    const bDate = bNotas[0]?.fecha_creacion ?? ''
    return bDate.localeCompare(aDate)
  })

  return (
    <div className="space-y-8">
      {candidatosSorted.map(([postulanteId, candidatoNotas]) => {
        const nombre = candidatoNotas[0]?.nombre_completo ?? 'Candidato eliminado'
        const isDeleted = candidatoNotas[0]?.nombre_completo === null

        return (
          <section key={postulanteId}>
            {/* Candidate heading */}
            <div className="flex items-center gap-3 mb-3">
              <Link
                href={`/reclutador/postulantes/${postulanteId}`}
                className={`text-[17px] font-bold hover:underline ${
                  isDeleted ? 'text-muted' : 'text-ink'
                }`}
              >
                {nombre}
              </Link>
              <CountBadge tone="primary">{candidatoNotas.length}</CountBadge>
            </div>

            {/* Notes for this candidate */}
            <div className="space-y-3 pl-2 border-l-2 border-neutral-200">
              {candidatoNotas.map((nota) => (
                <NotaCard key={nota.id} nota={nota} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
