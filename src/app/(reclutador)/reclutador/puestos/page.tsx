import { Suspense } from 'react'
import Link from 'next/link'
import { TyCGate } from '@/components/shared/tyc-gate'
import { Badge, EmptyState, Table } from '@/components/ui'
import type { Column } from '@/components/ui'
import { BuildingIcon, PlusIcon, AlertTriangleIcon, AlertCircleIcon } from '@/components/icons'
import {
  getMisPuestos,
  getConteoPostulacionesCicloActual,
  getCiclosVigentes,
} from '@/modules/puestos/queries'
import { calcularAlertaInactividad } from '@/modules/puestos/actividad-alerta'
import { getConfiguracionSistema } from '@/modules/configuracion/queries'
import { getMisEmpresasBase } from '@/modules/empresas/queries'
import { paginar } from '@/lib/pagination'
import { Paginador } from '@/components/shared/list-controls'
import { PuestoAcciones } from './puesto-acciones'
import { FiltrosPuestos } from './filtros-puestos'

export const metadata = { title: 'Mis puestos — MiLiors' }

type SearchParams = Promise<{
  orden?: string; estado?: string; empresa?: string; q?: string; page?: string
}>

export default async function MisPuestosPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { orden, estado, empresa: filtroEmpresa, q: qRaw, page: pageParam } = await searchParams
  const q = qRaw?.trim().toLowerCase() ?? ''
  const [puestos, { diasInactividadCierre }, empresas] = await Promise.all([
    getMisPuestos(),
    getConfiguracionSistema(),
    getMisEmpresasBase(),
  ])

  // Todas las empresas del reclutador, no solo las que ya tienen puestos.
  const empresaOpts = empresas.map((e) => ({
    value: e.id,
    label: e.activa ? e.nombre_empresa : `${e.nombre_empresa} · de baja`,
  }))

  // Filtro por estado (activo / cerrado), empresa y búsqueda por título sobre los datos ya cargados
  const filtered = puestos.filter((p) => {
    if (estado === 'activo' && !p.activo) return false
    if (estado === 'cerrado' && p.activo) return false
    if (filtroEmpresa && p.empresa_id !== filtroEmpresa) return false
    if (q && !p.titulo_puesto.toLowerCase().includes(q)) return false
    return true
  })

  // El ciclo vigente define las dos fechas de la tabla: apertura (inicio) y pausa
  // (fin, solo si el ciclo está cerrado). Hace falta para todos los puestos, no
  // solo para la página visible, porque también se ordena por la fecha de pausa.
  const ciclos = await getCiclosVigentes(filtered.map((p) => p.id))
  const apertura = (p: { id: string; fecha_publicacion: string }) =>
    ciclos.get(p.id)?.inicio ?? p.fecha_publicacion
  const pausa = (p: { id: string }) => ciclos.get(p.id)?.fin ?? null

  const visibles = [...filtered].sort((a, b) => {
    // Orden por fecha de pausa: los puestos activos (sin pausa) van al final.
    if (orden === 'pausa' || orden === 'pausa_antiguos') {
      const pa = pausa(a)
      const pb = pausa(b)
      if (!pa && !pb) return 0
      if (!pa) return 1
      if (!pb) return -1
      const diff = new Date(pa).getTime() - new Date(pb).getTime()
      return orden === 'pausa_antiguos' ? diff : -diff
    }

    // Por defecto, orden por fecha de apertura (más recientes primero).
    const diff = new Date(apertura(a)).getTime() - new Date(apertura(b)).getTime()
    return orden === 'antiguos' ? diff : -diff
  })

  const { page, pageCount, slice } = paginar(visibles, pageParam)

  // Sólo la página visible necesita el conteo de postulaciones.
  const conteoPostulaciones = await getConteoPostulacionesCicloActual(slice.map((p) => p.id))

  type Puesto = (typeof visibles)[number]

  const columns: Column<Puesto>[] = [
    {
      key: 'titulo',
      header: 'Título',
      width: '2fr',
      cell: (p) => {
        const postulaciones = conteoPostulaciones.get(p.id) ?? 0
        return (
          <div>
            <p className="truncate text-[13px] font-semibold text-ink">{p.titulo_puesto}</p>
            <p className="text-xs text-neutral-400">
              {p.nombre_empresa && `${p.nombre_empresa} · `}
              {postulaciones} postulación{postulaciones !== 1 ? 'es' : ''}
              {p.nombre_sector && ` · ${p.nombre_sector}`}
            </p>
          </div>
        )
      },
    },
    {
      key: 'estado',
      header: 'Estado',
      align: 'center',
      width: '1.5fr',
      cell: (p) => {
        // La alerta solo aplica a puestos activos (los pausados ya no corren
        // riesgo de pausa automática).
        const alerta =
          p.activo && p.fecha_ultima_actividad
            ? calcularAlertaInactividad(p.fecha_ultima_actividad, diasInactividadCierre)
            : null
        return (
          <div className="flex flex-col items-center gap-1.5">
            {alerta ? (
              // Con alerta, el puntito verde alcanza como señal de "activo":
              // el cartel de advertencia queda como protagonista.
              <span
                className="h-2 w-2 rounded-full bg-success-solid"
                title="Activo"
                aria-label="Activo"
              />
            ) : (
              <Badge tone={p.activo ? 'success' : 'neutral'} dot>
                {p.activo ? 'Activo' : 'Pausado'}
              </Badge>
            )}
            {alerta && (
              <Badge tone={alerta.tone === 'error' ? 'error' : 'warning'} className="whitespace-nowrap">
                {alerta.tone === 'error' ? (
                  <AlertCircleIcon size={13} strokeWidth={2.5} className="flex-none" />
                ) : (
                  <AlertTriangleIcon size={13} strokeWidth={2.5} className="flex-none" />
                )}
                {alerta.label}
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      key: 'apertura',
      header: 'Apertura',
      cell: (p) => (
        <span className="text-[13px] text-neutral-400">
          {new Date(apertura(p)).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </span>
      ),
    },
    {
      key: 'pausado',
      header: 'Pausado',
      cell: (p) => {
        const fin = pausa(p)
        // Ciclo abierto: el puesto está corriendo y no hay pausa que mostrar.
        if (!fin) return <span className="text-[13px] text-neutral-300">—</span>
        return (
          <span className="text-[13px] text-neutral-400">
            {new Date(fin).toLocaleDateString('es-AR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })}
          </span>
        )
      },
    },
    {
      key: 'acciones',
      header: 'Acciones',
      align: 'center',
      // Ancho fijo suficiente para que las seis acciones entren en una sola fila.
      width: '380px',
      cell: (p) => <PuestoAcciones puestoId={p.id} activo={p.activo} />,
    },
  ]

  return (
    <TyCGate>
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-ink">Mis puestos</h1>
            <p className="mt-1 text-muted">{puestos.length} puesto{puestos.length !== 1 ? 's' : ''}</p>
          </div>
          <Link
            href="/reclutador/puestos/nuevo"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-600 px-[18px] text-sm font-semibold text-white hover:brightness-105"
          >
            <PlusIcon size={16} />
            Nuevo puesto
          </Link>
        </div>

        {puestos.length > 0 && (
          <Suspense>
            <FiltrosPuestos
              empresas={empresaOpts}
              totalVisible={visibles.length}
              totalTotal={puestos.length}
            />
          </Suspense>
        )}

        {puestos.length === 0 ? (
          <EmptyState
            icon={<BuildingIcon size={24} />}
            title="Todavía no publicaste puestos"
            description="Creá tu primer puesto y empezá a recibir postulaciones."
            action={
              <Link
                href="/reclutador/puestos/nuevo"
                className="inline-flex h-10 items-center gap-2 rounded-md bg-primary-600 px-5 text-sm font-semibold text-white hover:brightness-105"
              >
                <PlusIcon size={16} />
                Publicar puesto
              </Link>
            }
          />
        ) : visibles.length === 0 ? (
          <EmptyState
            icon={<BuildingIcon size={24} />}
            title="Ningún puesto coincide con los filtros"
            description="Probá cambiando o limpiando los filtros."
          />
        ) : (
          <Table columns={columns} rows={slice} rowKey={(p) => p.id} />
        )}

        {visibles.length > 0 && <Paginador page={page} pageCount={pageCount} />}
      </div>
    </TyCGate>
  )
}
