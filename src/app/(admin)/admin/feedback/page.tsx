import {
  getFeedbackCompetenciasAdmin,
  getFeedbackGlobalAdmin,
  LIMITE_FILAS_CONSULTA,
  contarFeedbackCompetencias,
  contarFeedbackGlobal,
  agregarPorCompetencia,
  type FeedbackFiltros,
  type AgregadoCompetencia,
  type FeedbackGlobalRow,
} from '@/modules/admin/queries'
import { Alert, KpiCard, Table, EmptyState } from '@/components/ui'
import type { Column } from '@/components/ui'
import { BarChartIcon, CheckCircleIcon, StarIcon, MessageIcon, DownloadIcon } from '@/components/icons'
import { FiltrosFeedback } from './filtros-feedback'
import { ConfigReactivacion } from './config-reactivacion'
import { ComoLeer } from './como-leer'
import { getConfiguracionSistema } from '@/modules/configuracion/queries'
import { SearchInput, FilterSelect, ClearFilters, Paginador } from '@/components/shared/list-controls'
import { paginar } from '@/lib/pagination'

export const metadata = { title: 'Feedback del informe — Admin MiLiors' }

type SearchParams = Promise<{
  eneatipo?: string
  competencia?: string
  nivel?: string
  valoracion?: string
  dias?: string
  desde?: string
  hasta?: string
  page?: string
  // Listado de comentarios (segundo listado de la pantalla).
  qC?: string
  ordenC?: string
  pageC?: string
}>

const ORDEN_COMENTARIOS_OPTS = [
  { value: '', label: 'Respuesta: más reciente' },
  { value: 'fecha_asc', label: 'Respuesta: más antigua' },
  { value: 'repr_desc', label: 'Representatividad: mayor' },
  { value: 'repr_asc', label: 'Representatividad: menor' },
]

/** Las respuestas ya vienen por fecha desc; el resto de los órdenes va acá. */
function ordenarComentarios(rows: FeedbackGlobalRow[], orden: string): FeedbackGlobalRow[] {
  if (!orden) return rows
  return [...rows].sort((a, b) => {
    if (orden === 'fecha_asc') return a.respondidoAt.localeCompare(b.respondidoAt)
    if (orden === 'repr_desc') return b.representatividad - a.representatividad
    return a.representatividad - b.representatividad
  })
}

/**
 * Query string de los filtros vigentes, para que el Excel baje lo mismo que se ve.
 * `qC` va aparte de `filtros` porque sólo alcanza al listado de comentarios,
 * pero tiene que viajar igual: si la pantalla muestra 3, el archivo no puede
 * traer 300.
 */
function filtrosQS(filtros: FeedbackFiltros, busquedaComentario?: string): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filtros)) {
    if (value) params.set(key, value)
  }
  if (busquedaComentario) params.set('qC', busquedaComentario)
  return params.toString()
}

function pct(parte: number, total: number): number {
  return total === 0 ? 0 : Math.round((parte / total) * 100)
}

/** Barra apilada: de un vistazo se ve si una competencia está corrida o centrada. */
function BarraDistribucion({ a }: { a: AgregadoCompetencia }) {
  const segmentos = [
    { n: a.subestima, className: 'bg-primary-500' },
    { n: a.justo, className: 'bg-emerald-500' },
    { n: a.sobrestima, className: 'bg-amber-500' },
  ]
  return (
    <span className="flex h-2 w-full overflow-hidden rounded-full bg-neutral-100" aria-hidden>
      {segmentos.map((s, i) => (
        <span key={i} className={s.className} style={{ width: `${pct(s.n, a.total)}%` }} />
      ))}
    </span>
  )
}

export default async function FeedbackPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams

  const filtros: FeedbackFiltros = {
    eneatipo: sp.eneatipo,
    competencia: sp.competencia,
    nivel: sp.nivel,
    valoracion: sp.valoracion,
    dias: sp.dias,
    desde: sp.desde,
    hasta: sp.hasta,
  }

  const [valoraciones, globales, totalHistorico, totalGlobalHistorico, config] = await Promise.all([
    getFeedbackCompetenciasAdmin(filtros),
    getFeedbackGlobalAdmin(filtros),
    contarFeedbackCompetencias(),
    contarFeedbackGlobal(),
    getConfiguracionSistema(),
  ])

  // Se tocó el techo de filas: los porcentajes salen de una muestra recortada
  // por fecha de carga. Callarlo sería peor que no mostrarlos.
  const truncado =
    valoraciones.length >= LIMITE_FILAS_CONSULTA || globales.length >= LIMITE_FILAS_CONSULTA

  const agregados = agregarPorCompetencia(valoraciones)
  const totalJusto = valoraciones.filter(v => v.valoracion === 'JUSTO').length

  // Nadie respondió nada todavía. Se distingue de "valoraron competencias pero
  // los filtros no dejan nada" y de "sólo contestaron la pregunta de cierre":
  // con un comentario cargado, decir "todavía no hay feedback" es falso.
  const sinFeedbackAlguno = totalHistorico === 0 && totalGlobalHistorico === 0

  const comentarios = globales.filter(g => g.comentario)
  // Cruda para el link del Excel (que la muestra en el subtítulo del archivo) y
  // en minúsculas para comparar acá.
  const busquedaComentario = sp.qC?.trim() ?? ''
  const qC = busquedaComentario.toLowerCase()
  const comentariosFiltrados = qC
    ? comentarios.filter(c => c.comentario!.toLowerCase().includes(qC))
    : comentarios
  const comentariosVisibles = ordenarComentarios(comentariosFiltrados, sp.ordenC ?? '')
  const { page: pageC, pageCount: pageCountC, slice: comentariosPagina } = paginar(
    comentariosVisibles,
    sp.pageC,
  )

  const comentarioColumns: Column<FeedbackGlobalRow>[] = [
    {
      key: 'comentario',
      header: 'Comentario',
      width: '3fr',
      cell: row => <p className="text-[13px] leading-relaxed text-ink">{row.comentario}</p>,
    },
    {
      key: 'representatividad',
      header: 'Representatividad',
      align: 'right',
      cell: row => (
        <span className="text-[13px] font-semibold tabular-nums text-ink-soft">
          {row.representatividad}%
        </span>
      ),
    },
    {
      key: 'eneatipo',
      header: 'Eneatipo',
      align: 'center',
      cell: row =>
        row.eneatipo ? (
          <span className="text-[12.5px] text-ink-soft">{row.eneatipo}</span>
        ) : (
          <span className="text-[12px] text-neutral-400">—</span>
        ),
    },
    {
      key: 'respondidoAt',
      header: 'Respondido',
      cell: row => (
        <span className="text-[12px] text-muted">
          {new Date(row.respondidoAt).toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </span>
      ),
    },
  ]
  // `representatividad` ya viene en porcentaje (10..100), así que el promedio
  // se muestra tal cual, sin reescalar.
  const promedioRepresentatividad =
    globales.length === 0
      ? null
      : `${Math.round(globales.reduce((acc, g) => acc + g.representatividad, 0) / globales.length)}%`

  const columns: Column<AgregadoCompetencia>[] = [
    {
      key: 'competencia',
      header: 'Competencia',
      width: '2fr',
      cell: row => (
        <div>
          <p className="font-medium text-ink leading-tight">{row.nombre}</p>
          <p className="text-[11px] text-muted">{row.total} respuestas</p>
        </div>
      ),
    },
    {
      key: 'distribucion',
      header: 'Distribución',
      width: '1.5fr',
      cell: row => (
        <div className="w-full space-y-1">
          <BarraDistribucion a={row} />
          <p className="text-[11px] text-muted">
            {pct(row.subestima, row.total)}% subestimado · {pct(row.justo, row.total)}% correcto ·{' '}
            {pct(row.sobrestima, row.total)}% sobrestimado
          </p>
        </div>
      ),
    },
    {
      key: 'sesgo',
      header: 'Sesgo',
      cell: row => {
        const tone =
          Math.abs(row.sesgo) >= 30
            ? 'text-error'
            : Math.abs(row.sesgo) >= 15
            ? 'text-amber-600'
            : 'text-muted'
        return (
          <span className={`text-[13px] font-semibold tabular-nums ${tone}`}>
            {row.sesgo > 0 ? '+' : ''}
            {row.sesgo}
          </span>
        )
      },
    },
  ]

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <h1 className="text-[22px] font-extrabold tracking-tight text-ink">Feedback del informe</h1>
      <p className="mt-1 text-[13px] text-muted">
        Qué tan bien calibrado está el motor de competencias, según los propios postulantes. No
        modifica ningún informe: es insumo para ajustar la matriz eneatipo→competencia y el factor
        de contraste.
      </p>

      <div className="mt-8">
        <ConfigReactivacion diasActual={config.diasReactivarFeedback} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          icon={<BarChartIcon size={20} />}
          tone="violet"
          label="Valoraciones"
          value={valoraciones.length}
        />
        <KpiCard
          icon={<CheckCircleIcon size={20} />}
          tone="green"
          label="Nivel correcto"
          value={`${pct(totalJusto, valoraciones.length)}%`}
        />
        <KpiCard
          icon={<StarIcon size={20} />}
          tone="amber"
          label="Representatividad"
          value={promedioRepresentatividad ?? '—'}
        />
        <KpiCard
          icon={<MessageIcon size={20} />}
          tone="blue"
          label="Comentarios"
          value={comentarios.length}
        />
      </div>

      <div className="mt-8">
        <FiltrosFeedback totalVisible={valoraciones.length} totalTotal={totalHistorico} />
      </div>

      {truncado && (
        <div className="mt-4">
          <Alert tone="warning" title="Estos números son parciales">
            La consulta alcanzó el máximo de {LIMITE_FILAS_CONSULTA.toLocaleString('es-AR')}{' '}
            respuestas, así que los porcentajes salen de una muestra recortada y no del total.
            Achicá el rango de fechas para que la lectura sea confiable.
          </Alert>
        </div>
      )}

      {/* Export: un solo archivo con los cuatro granos, ya agregados. */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a
          href={`/api/admin/feedback/export?${filtrosQS(filtros, busquedaComentario)}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-neutral-200 bg-surface px-3 text-[12.5px] font-medium text-muted transition-colors hover:border-primary-300 hover:bg-primary-tint hover:text-primary-600"
        >
          <DownloadIcon size={14} />
          Descargar Excel
        </a>
        <span className="text-[11px] text-muted">
          Cuatro hojas con lo que estos filtros dejan a la vista. Seudónimo: incluye el id del
          postulante, nunca nombre ni email.
        </span>
      </div>

      <div className="mt-6">
        <ComoLeer />
      </div>

      <div className="mt-6">
        {agregados.length === 0 ? (
          <EmptyState
            icon={<BarChartIcon size={22} />}
            title={
              sinFeedbackAlguno
                ? 'Todavía no hay feedback'
                : totalHistorico === 0
                ? 'Sin valoraciones por competencia'
                : 'Sin resultados'
            }
            description={
              sinFeedbackAlguno
                ? 'Ningún postulante valoró su informe todavía. Las respuestas aparecen acá a medida que se cargan.'
                : totalHistorico === 0
                ? 'Hay respuestas a la pregunta de cierre, pero nadie valoró competencia por competencia todavía. Los comentarios se listan más abajo.'
                : 'Ninguna respuesta coincide con los filtros aplicados.'
            }
          />
        ) : (
          <>
            <Table columns={columns} rows={agregados} rowKey={row => row.key} />
            <p className="mt-2 text-[11px] text-muted">
              Sesgo = % que la considera baja − % que la considera alta. Positivo: el motor le queda
              corto y conviene subir su peso. Negativo: se pasa. Cerca de cero: calibrada.
            </p>
          </>
        )}
      </div>

      {comentarios.length > 0 && (
        <div className="mt-10">
          <h2 className="text-[15px] font-bold text-ink">Comentarios</h2>
          <p className="mt-0.5 text-[12px] text-muted">
            Texto libre de la pregunta de cierre. Los filtros de arriba también los alcanzan.
          </p>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchInput paramKey="qC" placeholder="Buscar en los comentarios…" />
            <FilterSelect
              paramKey="ordenC"
              options={ORDEN_COMENTARIOS_OPTS}
              ariaLabel="Ordenar comentarios"
              className="w-full sm:w-56"
            />
            <ClearFilters keys={['qC', 'ordenC']} />
            {comentariosVisibles.length !== comentarios.length && (
              <span className="whitespace-nowrap text-xs text-muted sm:ml-auto">
                {comentariosVisibles.length} de {comentarios.length}
              </span>
            )}
          </div>

          <div className="mt-4">
            {comentariosPagina.length === 0 ? (
              <EmptyState
                icon={<MessageIcon size={22} />}
                title="Sin resultados"
                description="Ningún comentario coincide con la búsqueda."
              />
            ) : (
              <Table columns={comentarioColumns} rows={comentariosPagina} rowKey={row => row.id} />
            )}
          </div>

          <Paginador page={pageC} pageCount={pageCountC} paramKey="pageC" />
        </div>
      )}
    </div>
  )
}
