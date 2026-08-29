import { Suspense } from 'react'
import Link from 'next/link'
import { Card, Badge, EmptyState } from '@/components/ui'
import { NotebookIcon } from '@/components/icons'
import { getTodasLasNotasReclutador } from '@/modules/postulantes/queries'
import { getPostulacionesRecibidas } from '@/modules/puestos/queries'
import { paginar } from '@/lib/pagination'
import { Paginador } from '@/components/shared/list-controls'
import { FiltrosNotas } from './filtros-notas'
import { NotaTexto } from '@/components/shared/nota-texto'
import { normalizarTexto } from '@/lib/texto'
import { EliminarNotaBtn } from './eliminar-nota-btn'

export const metadata = { title: 'Mis notas — MiLiors' }

type SearchParams = Promise<{ candidato?: string; dias?: string; q?: string; page?: string }>

/** Postulación (aplicación a un puesto) vinculada a una nota */
type PostulacionRef = { id: string; puesto_id: string; titulo_puesto: string | null }

/** Timestamp de corte para el filtro "hace cuánto" (o null si no hay filtro) */
function fechaCorte(dias: number | undefined): number | null {
  if (!dias) return null
  return Date.now() - dias * 24 * 60 * 60 * 1000
}

/**
 * Determina a qué postulación(es) corresponde una nota. Las notas no guardan
 * el puesto, así que rastreamos las postulaciones del candidato a mis puestos:
 * si la nota tiene puesto_id y coincide, mostramos esa; si no, mostramos todas
 * las postulaciones del candidato.
 */
function postulacionesDeNota(
  nota: { postulante_id: string; puesto_id: string | null },
  porPostulante: Map<string, PostulacionRef[]>,
): PostulacionRef[] {
  const delCandidato = porPostulante.get(nota.postulante_id) ?? []
  if (nota.puesto_id) {
    const exacta = delCandidato.find((p) => p.puesto_id === nota.puesto_id)
    if (exacta) return [exacta]
  }
  return delCandidato
}

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
  const dias = sp.dias ? parseInt(sp.dias, 10) : undefined
  const q = normalizarTexto(sp.q ?? '')

  // Fetch all notes (unfiltered) to populate the candidate dropdown.
  // También traemos las postulaciones recibidas para vincular cada nota con la
  // postulación (puesto + postulante) a la que corresponde.
  const [todasLasNotas, postulaciones] = await Promise.all([
    getTodasLasNotasReclutador(),
    getPostulacionesRecibidas(),
  ])

  // Mapa postulante → sus postulaciones a mis puestos, para rastrear a qué
  // puesto se postuló el candidato al que le puse la nota.
  const postulacionesPorPostulante = new Map<string, PostulacionRef[]>()
  for (const p of postulaciones) {
    const ref: PostulacionRef = {
      id: p.id,
      puesto_id: p.puesto_id,
      titulo_puesto: p.titulo_puesto ?? null,
    }
    const lista = postulacionesPorPostulante.get(p.postulante_id)
    if (lista) lista.push(ref)
    else postulacionesPorPostulante.set(p.postulante_id, [ref])
  }

  // Derive distinct candidates from all notes for the filter dropdown
  const candidatosConNotas = Array.from(
    new Map(
      todasLasNotas.map((n) => [
        n.postulante_id,
        { id: n.postulante_id, nombre: n.nombre_completo ?? 'Candidato eliminado' },
      ])
    ).values()
  ).sort((a, b) => a.nombre.localeCompare(b.nombre))

  // Umbral temporal ("hace cuánto"): notas creadas desde hace N días
  const desde = fechaCorte(dias)

  // Apply filters (candidate + date + text) over already-loaded data
  const notas = todasLasNotas.filter((n) => {
    if (candidatoFiltro && n.postulante_id !== candidatoFiltro) return false
    if (desde && new Date(n.fecha_creacion).getTime() < desde) return false
    if (q && !normalizarTexto(n.contenido).includes(q)) return false
    return true
  })

  const { page, pageCount, slice } = paginar(notas, sp.page)

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Mis notas</h1>
        <p className="mt-1 text-muted text-sm">
          {todasLasNotas.length} nota{todasLasNotas.length !== 1 ? 's' : ''} en total
        </p>
      </div>

      {todasLasNotas.length > 0 && (
        <Suspense>
          <FiltrosNotas
            candidatos={candidatosConNotas}
            totalVisible={notas.length}
            totalTotal={todasLasNotas.length}
          />
        </Suspense>
      )}

      {/* Results */}
      {notas.length === 0 ? (
        <EmptyState
          icon={<NotebookIcon size={24} />}
          title={todasLasNotas.length === 0 ? 'Sin notas aún' : 'Ninguna nota coincide con los filtros'}
          description={
            todasLasNotas.length === 0
              ? 'No hay notas privadas para mostrar. Visitá el perfil de un candidato para agregar una.'
              : 'Probá cambiando o limpiando los filtros.'
          }
          action={
            todasLasNotas.length === 0 ? (
              <Link
                href="/reclutador/postulantes"
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary-600 px-4 text-sm font-semibold text-white hover:brightness-105"
              >
                Buscar candidatos
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {slice.map((nota) => (
            <NotaCard
              key={nota.id}
              nota={nota}
              postulaciones={postulacionesDeNota(nota, postulacionesPorPostulante)}
            />
          ))}
        </div>
      )}

      {notas.length > 0 && <Paginador page={page} pageCount={pageCount} />}
    </div>
  )
}

// ─── Note card ────────────────────────────────────────────────────────────────

function NotaCard({
  nota,
  postulaciones,
}: {
  nota: {
    id: string
    contenido: string
    fecha_creacion: string
    titulo_puesto: string | null
    puesto_id: string | null
    postulante_id: string
    nombre_completo: string | null
  }
  postulaciones: PostulacionRef[]
}) {
  const candidatoNombre = nota.nombre_completo ?? 'Candidato eliminado'
  const isDeleted = nota.nombre_completo === null
  // Sólo enlazamos a la postulación si el candidato sigue existiendo.
  const postulacionesVisibles = isDeleted ? [] : postulaciones

  return (
    <Card>
      <div className="space-y-3">
        {/* Candidate link + delete */}
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/reclutador/postulantes/${nota.postulante_id}`}
            className={`text-[15px] font-semibold hover:underline ${
              isDeleted ? 'text-muted' : 'text-primary-600'
            }`}
          >
            {candidatoNombre}
          </Link>
          <EliminarNotaBtn notaId={nota.id} postulanteId={nota.postulante_id} />
        </div>

        {/* Note content */}
        <NotaTexto
          contenido={nota.contenido}
          titulo={`Nota sobre ${candidatoNombre}`}
          className="text-sm leading-relaxed text-ink"
        />

        {/* Postulación vinculada (a qué puesto se postuló el candidato) */}
        {postulacionesVisibles.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
            <span className="text-[11.5px] font-semibold uppercase tracking-wide text-neutral-400">
              {postulacionesVisibles.length > 1 ? 'Postulaciones' : 'Postulación'}
            </span>
            {postulacionesVisibles.map((p) => (
              <Link
                key={p.id}
                href={`/reclutador/postulantes/${nota.postulante_id}?postulacion=${p.id}&from=notas`}
              >
                <Badge tone="primary" className="hover:brightness-95 transition-[filter]">
                  {p.titulo_puesto ?? 'Ver postulación'}
                </Badge>
              </Link>
            ))}
          </div>
        )}

        {/* Date */}
        <p className="text-xs text-muted">{formatFecha(nota.fecha_creacion)}</p>
      </div>
    </Card>
  )
}
