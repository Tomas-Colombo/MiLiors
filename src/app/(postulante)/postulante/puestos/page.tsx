import { Suspense } from 'react'
import { requireEneagramaCompleto } from '@/lib/guards'
import { TyCGate } from '@/components/shared/tyc-gate'
import { Card, Badge, EmptyState } from '@/components/ui'
import { BuildingIcon, ChevronLeftIcon, ChevronRightIcon } from '@/components/icons'
import {
  getPuestosActivos,
  getSectores,
  getMisPostulacionesPuestoIds,
  PUESTOS_PER_PAGE,
} from '@/modules/puestos/queries'
import { getProvincias, getDepartamentosPorProvincia, getLocalidadIdsPorDepartamento } from '@/modules/ubicacion/queries'
import { getUltimoCertificado } from '@/modules/certificado/queries'
import { getPuestosConFormulario } from '@/modules/preselector/queries'
import { getCarreras, getMiCarreraId } from '@/modules/carreras/queries'
import { PostularButton } from './postular-button'
import { PuestosFilters } from './filters'
import { PuestoCard } from './puesto-card'
import Link from 'next/link'
import { AlertTriangleIcon } from '@/components/icons'

export const metadata = { title: 'Buscar puestos — TalentID' }

type SearchParams = Promise<Record<string, string>>

function buildUrl(sp: Record<string, string>, overrides: Record<string, string | undefined>) {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries({ ...sp, ...overrides })) {
    if (v !== undefined && v !== '') params.set(k, v)
  }
  return `/postulante/puestos?${params.toString()}`
}

export default async function BuscarPuestosPage({ searchParams }: { searchParams: SearchParams }) {
  await requireEneagramaCompleto()
  const sp = await searchParams

  const page = Math.max(0, parseInt(sp.page ?? '0', 10))
  const diasDesde = sp.dias ? parseInt(sp.dias, 10) : undefined
  // Default to "todos" (undefined) so the first view shows every job. The user narrows
  // down explicitly with 'postulados' / 'no_postulados'.
  const postulacion = (sp.postulacion === 'postulados' || sp.postulacion === 'no_postulados')
    ? sp.postulacion
    : undefined

  const provinciaFiltro = sp.provincia || undefined
  const departamentoFiltro = sp.departamento || undefined
  const carreraFiltro = sp.carrera || undefined

  const [sectores, yaPostuladosSet, certificado, provincias, departamentosFiltro, carreras, miCarreraId] = await Promise.all([
    getSectores(),
    getMisPostulacionesPuestoIds(),
    getUltimoCertificado(),
    getProvincias(),
    provinciaFiltro ? getDepartamentosPorProvincia(provinciaFiltro) : Promise.resolve([]),
    getCarreras(),
    getMiCarreraId(),
  ])

  // El puesto guarda localidad_id: el filtro por departamento se resuelve a sus localidades.
  const localidadIdsFiltro = provinciaFiltro && departamentoFiltro
    ? await getLocalidadIdsPorDepartamento(provinciaFiltro, departamentoFiltro)
    : undefined

  // La carrera cargada en el perfil del postulante va primero en el selector.
  const carrerasOrdenadas = miCarreraId
    ? [
        ...carreras.filter((c) => c.value === miCarreraId),
        ...carreras.filter((c) => c.value !== miCarreraId),
      ]
    : carreras

  const postulacionIds = [...yaPostuladosSet]

  const { items: puestos, total } = await getPuestosActivos({
    sectorId: sp.sector || undefined,
    carreraId: carreraFiltro,
    cargaHoraria: sp.carga_horaria || undefined,
    ubicacion: sp.ubicacion || undefined,
    provinciaId: provinciaFiltro,
    localidadIds: localidadIdsFiltro,
    busqueda: sp.q || undefined,
    diasDesde,
    page,
    postulacion,
    postulacionIds,
  })

  const puestosConFormulario = await getPuestosConFormulario(puestos.map((p) => p.id))

  const sinCertificado = !certificado
  const certDesactualizado = certificado?.desactualizado === true
  const bloqueado = sinCertificado || certDesactualizado

  const totalPages = Math.ceil(total / PUESTOS_PER_PAGE)

  return (
    <TyCGate>
      <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
        {/* Encabezado */}
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Buscar puestos</h1>
          <p className="mt-1 text-sm text-muted">
            {total} resultado{total !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Filtros */}
        <Card padding="lg">
          <Suspense fallback={<div className="h-36 animate-pulse rounded-lg bg-neutral-100" />}>
            <PuestosFilters
              sectores={sectores}
              provincias={provincias}
              departamentos={departamentosFiltro}
              carreras={carrerasOrdenadas}
            />
          </Suspense>
        </Card>

        {/* Banner certificado */}
        {bloqueado && (
          <div className="flex items-start gap-3 rounded-xl border border-warning-border bg-warning-bg px-4 py-3">
            <AlertTriangleIcon size={18} className="mt-0.5 shrink-0 text-warning-solid" />
            <div className="text-sm">
              <span className="font-semibold text-warning">
                {sinCertificado ? 'Necesitás un certificado para postularte.' : 'Tu certificado está desactualizado.'}
              </span>
              {' '}
              <Link
                href="/postulante/certificado"
                className="text-warning underline underline-offset-2 hover:text-warning-strong transition-colors"
              >
                {sinCertificado ? 'Generá tu certificado aquí.' : 'Generá uno nuevo aquí.'}
              </Link>
            </div>
          </div>
        )}

        {/* Resultados */}
        {puestos.length === 0 && carreraFiltro ? (
          <div className="flex items-start gap-3 rounded-xl border border-warning-border bg-warning-bg px-4 py-3">
            <AlertTriangleIcon size={18} className="mt-0.5 shrink-0 text-warning-solid" />
            <p className="text-sm font-medium text-warning">
              No encontramos puestos para {carreras.find((c) => c.value === carreraFiltro)?.label ?? 'esta carrera'}.
              Esto no significa que no existan: puede haber puestos que apliquen a tu perfil sin una
              carrera asignada. Probá buscando sin este filtro o ajustando los demás.
            </p>
          </div>
        ) : puestos.length === 0 ? (
          <EmptyState
            icon={<BuildingIcon size={24} />}
            title="No encontramos puestos"
            description="Probá ajustando los filtros de búsqueda."
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {puestos.map((puesto) => (
                <PuestoCard
                  key={puesto.id}
                  puesto={puesto}
                  tieneFormulario={puestosConFormulario.has(puesto.id)}
                  actions={
                    <PostularButton
                      puestoId={puesto.id}
                      yaPostulo={yaPostuladosSet.has(puesto.id)}
                      disabled={bloqueado}
                      tieneFormulario={puestosConFormulario.has(puesto.id)}
                    />
                  }
                />
              ))}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                {page > 0 ? (
                  <Link
                    href={buildUrl(sp, { page: String(page - 1) })}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-surface text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                  >
                    <ChevronLeftIcon size={16} />
                  </Link>
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-100 text-neutral-300 cursor-not-allowed">
                    <ChevronLeftIcon size={16} />
                  </span>
                )}

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <Link
                      key={i}
                      href={buildUrl(sp, { page: String(i) })}
                      className={[
                        'flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition-colors',
                        i === page
                          ? 'bg-primary-600 text-white'
                          : 'border border-neutral-200 bg-surface text-neutral-600 hover:bg-neutral-50',
                      ].join(' ')}
                    >
                      {i + 1}
                    </Link>
                  ))}
                </div>

                {page < totalPages - 1 ? (
                  <Link
                    href={buildUrl(sp, { page: String(page + 1) })}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 bg-surface text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                  >
                    <ChevronRightIcon size={16} />
                  </Link>
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-100 text-neutral-300 cursor-not-allowed">
                    <ChevronRightIcon size={16} />
                  </span>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </TyCGate>
  )
}
