import {
  getFeedbackCompetenciasAdmin,
  getFeedbackGlobalAdmin,
  contarFeedbackCompetencias,
  agregarPorCompetencia,
  type FeedbackFiltros,
  type AgregadoCompetencia,
} from '@/modules/admin/queries'
import { KpiCard, Card, Table, EmptyState } from '@/components/ui'
import type { Column } from '@/components/ui'
import { BarChartIcon, CheckCircleIcon, StarIcon, MessageIcon, DownloadIcon } from '@/components/icons'
import { FiltrosFeedback } from './filtros-feedback'
import { ConfigReactivacion } from './config-reactivacion'
import { getConfiguracionSistema } from '@/modules/configuracion/queries'
import { Paginador } from '@/components/shared/list-controls'
import { paginar } from '@/lib/pagination'

export const metadata = { title: 'Feedback del informe — Admin TalentID' }

type SearchParams = Promise<{
  eneatipo?: string
  competencia?: string
  nivel?: string
  valoracion?: string
  dias?: string
  desde?: string
  hasta?: string
  page?: string
}>

/** Query string de los filtros vigentes, para que el CSV baje lo mismo que se ve. */
function filtrosQS(filtros: FeedbackFiltros, tipo: 'competencias' | 'global'): string {
  const params = new URLSearchParams({ tipo })
  for (const [key, value] of Object.entries(filtros)) {
    if (value) params.set(key, value)
  }
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

  const [valoraciones, globales, totalHistorico, config] = await Promise.all([
    getFeedbackCompetenciasAdmin(filtros),
    getFeedbackGlobalAdmin(filtros),
    contarFeedbackCompetencias(),
    getConfiguracionSistema(),
  ])

  const agregados = agregarPorCompetencia(valoraciones)
  const totalJusto = valoraciones.filter(v => v.valoracion === 'JUSTO').length
  const comentarios = globales.filter(g => g.comentario)
  const { page, pageCount, slice: comentariosPagina } = paginar(comentarios, sp.page)
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
            {pct(row.subestima, row.total)}% bajo · {pct(row.justo, row.total)}% ok ·{' '}
            {pct(row.sobrestima, row.total)}% alto
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
          label="Dicen &ldquo;está bien&rdquo;"
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

      {/* Export: baja exactamente lo filtrado, en dos granos separados. */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a
          href={`/api/admin/feedback/export?${filtrosQS(filtros, 'competencias')}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-surface px-3 h-9 text-[12.5px] font-medium text-muted hover:bg-neutral-50 hover:text-ink hover:border-neutral-300 transition-colors"
        >
          <DownloadIcon size={14} />
          CSV por competencia
        </a>
        <a
          href={`/api/admin/feedback/export?${filtrosQS(filtros, 'global')}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-surface px-3 h-9 text-[12.5px] font-medium text-muted hover:bg-neutral-50 hover:text-ink hover:border-neutral-300 transition-colors"
        >
          <DownloadIcon size={14} />
          CSV respuestas globales
        </a>
        <span className="text-[11px] text-muted">
          Seudónimo: incluye el id del postulante, nunca nombre ni email.
        </span>
      </div>

      <div className="mt-6">
        {agregados.length === 0 ? (
          <EmptyState
            icon={<BarChartIcon size={22} />}
            title={totalHistorico === 0 ? 'Todavía no hay feedback' : 'Sin resultados'}
            description={
              totalHistorico === 0
                ? 'Ningún postulante valoró sus competencias todavía. Las respuestas aparecen acá a medida que se cargan.'
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
          <p className="mt-0.5 text-[12px] text-muted">{comentarios.length} en total.</p>
          <div className="mt-3 space-y-2">
            {comentariosPagina.map(c => (
              <Card key={c.id}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[13px] leading-relaxed text-ink">{c.comentario}</p>
                  <span className="shrink-0 text-[11px] text-muted">
                    {c.representatividad}%
                    {c.eneatipo ? ` · Eneatipo ${c.eneatipo}` : ''}
                  </span>
                </div>
              </Card>
            ))}
          </div>
          <Paginador page={page} pageCount={pageCount} />
        </div>
      )}
    </div>
  )
}
