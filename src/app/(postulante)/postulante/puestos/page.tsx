import { requireEneagramaCompleto } from '@/lib/guards'
import { TyCGate } from '@/components/shared/tyc-gate'
import { Card, Badge, EmptyState } from '@/components/ui'
import { SearchIcon, BuildingIcon } from '@/components/icons'
import { getPuestosActivos, getSectores, getMisPostulacionesPuestoIds } from '@/modules/puestos/queries'
import { CARGA_HORARIA_LABEL, UBICACION_LABEL } from '@/lib/constants/enums'
import { PostularButton } from './postular-button'

export const metadata = { title: 'Buscar puestos — TalentID' }

type SearchParams = Promise<Record<string, string>>

export default async function BuscarPuestosPage({ searchParams }: { searchParams: SearchParams }) {
  await requireEneagramaCompleto()
  const sp = await searchParams

  const [puestos, sectores, yaPostulados] = await Promise.all([
    getPuestosActivos({
      sectorId: sp.sector || undefined,
      cargaHoraria: sp.carga_horaria || undefined,
      ubicacion: sp.ubicacion || undefined,
      busqueda: sp.q || undefined,
    }),
    getSectores(),
    getMisPostulacionesPuestoIds(),
  ])

  return (
    <TyCGate>
      <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Buscar puestos</h1>
          <p className="mt-1 text-muted">{puestos.length} resultado{puestos.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Filters — plain GET form, works without JS */}
        <Card padding="sm">
          <form method="GET" className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <SearchIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                name="q"
                defaultValue={sp.q ?? ''}
                placeholder="Buscar por título…"
                className="h-10 w-full rounded-md border border-neutral-300 bg-surface pl-9 pr-3.5 text-sm outline-none focus:border-[1.5px] focus:border-primary-600 focus:ring-[3px] focus:ring-primary-50"
              />
            </div>

            <select
              name="sector"
              defaultValue={sp.sector ?? ''}
              className="h-10 rounded-md border border-neutral-300 bg-surface px-3.5 pr-8 text-sm outline-none focus:border-primary-600 appearance-none"
            >
              <option value="">Todos los sectores</option>
              {sectores.map((s) => (
                <option key={s.id} value={s.id}>{s.nombre_sector}</option>
              ))}
            </select>

            <select
              name="carga_horaria"
              defaultValue={sp.carga_horaria ?? ''}
              className="h-10 rounded-md border border-neutral-300 bg-surface px-3.5 pr-8 text-sm outline-none focus:border-primary-600 appearance-none"
            >
              <option value="">Cualquier carga horaria</option>
              {Object.entries(CARGA_HORARIA_LABEL).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>

            <select
              name="ubicacion"
              defaultValue={sp.ubicacion ?? ''}
              className="h-10 rounded-md border border-neutral-300 bg-surface px-3.5 pr-8 text-sm outline-none focus:border-primary-600 appearance-none"
            >
              <option value="">Cualquier modalidad</option>
              {Object.entries(UBICACION_LABEL).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>

            <button
              type="submit"
              className="h-10 rounded-md bg-primary-600 px-5 text-sm font-semibold text-white hover:brightness-105"
            >
              Filtrar
            </button>
            {(sp.q || sp.sector || sp.carga_horaria || sp.ubicacion) && (
              <a
                href="/postulante/puestos"
                className="flex h-10 items-center px-4 text-sm text-muted hover:text-ink"
              >
                Limpiar
              </a>
            )}
          </form>
        </Card>

        {/* Results */}
        {puestos.length === 0 ? (
          <EmptyState
            icon={<BuildingIcon size={24} />}
            title="No encontramos puestos"
            description="Probá ajustando los filtros de búsqueda."
          />
        ) : (
          <div className="space-y-4">
            {puestos.map((puesto) => (
              <Card key={puesto.id} padding="md">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h2 className="text-[15px] font-bold text-ink truncate">{puesto.titulo_puesto}</h2>
                      <Badge tone="neutral">{UBICACION_LABEL[puesto.ubicacion] ?? puesto.ubicacion}</Badge>
                      <Badge tone="neutral">{CARGA_HORARIA_LABEL[puesto.carga_horaria] ?? puesto.carga_horaria}</Badge>
                    </div>

                    {puesto.nombre_empresa && (
                      <p className="text-[13px] text-muted mb-2">{puesto.nombre_empresa}</p>
                    )}

                    {puesto.descripcion_texto && (
                      <p className="text-[13px] text-ink-soft line-clamp-2">
                        {puesto.descripcion_texto}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-neutral-400">
                      {puesto.nombre_sector && <span>{puesto.nombre_sector}</span>}
                      {puesto.idioma && <span>Idioma: {puesto.idioma}</span>}
                      {puesto.nivel_experiencia && <span>{puesto.nivel_experiencia}</span>}
                      <span>
                        {new Date(puesto.fecha_publicacion).toLocaleDateString('es-AR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex-none">
                    <PostularButton puestoId={puesto.id} yaPostulo={yaPostulados.has(puesto.id)} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </TyCGate>
  )
}
