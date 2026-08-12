import Link from 'next/link'
import { TyCGate } from '@/components/shared/tyc-gate'
import { Card, Badge, Chip, EmptyState } from '@/components/ui'
import { UsersIcon, SparklesIcon } from '@/components/icons'
import { buscarPostulantes } from '@/modules/postulantes/queries'
import { getCompetenciasCatalogo } from '@/modules/perfil-tecnico/queries'
import { getProvincias, getDepartamentosPorProvincia, getLocalidadIdsPorDepartamento } from '@/modules/ubicacion/queries'
import { getCarreras, getCarrerasOtras } from '@/modules/carreras/queries'
import { paginar } from '@/lib/pagination'
import { Paginador } from '@/components/shared/list-controls'
import { PostulantesFilters } from './filters'

export const metadata = { title: 'Buscar postulantes — TalentID' }

// searchParams in Next.js App Router is a Promise — must be awaited
type SearchParams = Promise<{
  busqueda?: string
  competencia?: string
  provincia?: string
  departamento?: string
  carrera?: string
  carreraOtra?: string
  page?: string
}>

export default async function BuscarPostulantesPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  // El perfil guarda localidad_id: el filtro por departamento se resuelve a sus localidades.
  const localidadIds = sp.provincia && sp.departamento
    ? await getLocalidadIdsPorDepartamento(sp.provincia, sp.departamento)
    : undefined

  const [postulantes, competencias, provincias, departamentos, carreras, carrerasOtras] = await Promise.all([
    buscarPostulantes({
      busqueda: sp.busqueda,
      competenciaId: sp.competencia,
      provinciaId: sp.provincia,
      localidadIds,
      carrera: sp.carrera,
      carreraOtra: sp.carreraOtra,
    }),
    getCompetenciasCatalogo(),
    getProvincias(),
    sp.provincia ? getDepartamentosPorProvincia(sp.provincia) : Promise.resolve([]),
    getCarreras(),
    sp.carrera === 'OTRAS' ? getCarrerasOtras() : Promise.resolve([]),
  ])

  const competenciaOpts = competencias.map((c) => ({ value: c.id, label: c.nombre }))

  const { page, pageCount, slice } = paginar(postulantes, sp.page, 12)

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

        {/* Filtros live (sin botón de buscar) — imitan la sección de postulaciones */}
        <PostulantesFilters
          competencias={competenciaOpts}
          provincias={provincias}
          departamentos={departamentos}
          carreras={carreras}
          carrerasOtras={carrerasOtras}
        />

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
            {slice.map((p) => (
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
                      {p.carrera && (
                        <p className="text-[13px] text-muted mt-0.5">{p.carrera}</p>
                      )}
                      {(p.nombre_localidad || p.nombre_provincia) && (
                        <p className="text-[12px] text-neutral-400 mt-1">
                          📍 {[p.nombre_localidad, p.nombre_provincia].filter(Boolean).join(', ')}
                        </p>
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

        {postulantes.length > 0 && <Paginador page={page} pageCount={pageCount} />}
      </div>
    </TyCGate>
  )
}
