import Link from 'next/link'
import { TyCGate } from '@/components/shared/tyc-gate'
import { Card, Badge, Chip, EmptyState } from '@/components/ui'
import { SearchIcon, UsersIcon, SparklesIcon } from '@/components/icons'
import { Input } from '@/components/ui'
import { buscarPostulantes } from '@/modules/postulantes/queries'

export const metadata = { title: 'Buscar postulantes — TalentID' }

// searchParams in Next.js App Router is a Promise — must be awaited
type SearchParams = Promise<{ busqueda?: string; competencia?: string }>

export default async function BuscarPostulantesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const postulantes = await buscarPostulantes({
    busqueda: sp.busqueda,
    competenciaId: sp.competencia,
  })

  return (
    <TyCGate>
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Buscar postulantes</h1>
          <p className="mt-1 text-muted text-sm">
            {postulantes.length} candidato{postulantes.length !== 1 ? 's' : ''} en búsqueda activa
          </p>
        </div>

        {/* Search form — pure GET, no JS required */}
        <form method="GET" action="" className="flex gap-3">
          <div className="flex-1">
            <Input
              name="busqueda"
              defaultValue={sp.busqueda ?? ''}
              placeholder="Buscar por nombre…"
              leftIcon={<SearchIcon size={16} />}
            />
          </div>
          <button
            type="submit"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-600 px-5 text-sm font-semibold text-white hover:brightness-105"
          >
            Buscar
          </button>
          {sp.busqueda && (
            <Link
              href="/reclutador/postulantes"
              className="inline-flex h-10 items-center rounded-md border border-neutral-300 bg-surface px-4 text-sm font-medium text-ink-soft hover:bg-neutral-50"
            >
              Limpiar
            </Link>
          )}
        </form>

        {/* Results */}
        {postulantes.length === 0 ? (
          <EmptyState
            icon={<UsersIcon size={24} />}
            title="Sin resultados"
            description={
              sp.busqueda
                ? `No se encontraron candidatos para "${sp.busqueda}".`
                : 'No hay candidatos en búsqueda activa por el momento.'
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {postulantes.map((p) => (
              <Link
                key={p.id}
                href={`/reclutador/postulantes/${p.id}`}
                className="block group"
              >
                <Card className="h-full transition-shadow group-hover:shadow-md">
                  <div className="space-y-3">
                    {/* Name */}
                    <div>
                      <p className="font-semibold text-ink text-[15px] leading-snug">
                        {p.nombre_completo}
                      </p>
                      {p.especificidad_puesto && (
                        <p className="text-[13px] text-muted mt-0.5">{p.especificidad_puesto}</p>
                      )}
                    </div>

                    {/* Eneatipo */}
                    {p.eneatipo_numero != null && (
                      <Badge tone="primary">
                        E{p.eneatipo_numero}
                        {p.eneatipo_nombre ? ` · ${p.eneatipo_nombre}` : ''}
                      </Badge>
                    )}

                    {/* Competencias — max 4 chips + overflow count */}
                    {p.competencias.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {p.competencias.slice(0, 4).map((c) => (
                          <Chip key={c.nombre}>{c.nombre}</Chip>
                        ))}
                        {p.competencias.length > 4 && (
                          <Chip>+{p.competencias.length - 4} más</Chip>
                        )}
                      </div>
                    )}

                    {/* AI assistant shortcut */}
                    <div className="pt-1 flex items-center gap-1.5 text-[12px] text-primary-600 font-medium">
                      <SparklesIcon size={14} />
                      Ver detalle
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </TyCGate>
  )
}
