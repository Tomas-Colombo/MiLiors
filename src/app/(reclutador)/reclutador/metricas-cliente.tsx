'use client'

import { useMemo, useState } from 'react'
import { Card, Select, ProgressBar } from '@/components/ui'
import type { DashboardMetrics } from '@/modules/dashboard/queries'
import { PostulacionesLineChart, type ChartPoint } from './postulaciones-line-chart'

// Colores propios del bloque de métricas (fijados por la identidad visual).
const LABEL = '#8B86A8'
const HINT = '#B8B3DC'
const OVER = '#5B4FE8'
const UNDER = '#E24B4A'

type Range = 'mes' | '3meses' | '6meses' | 'anio'

const RANGE_OPTS = [
  { value: 'mes', label: 'Último mes' },
  { value: '3meses', label: 'Últimos 3 meses' },
  { value: '6meses', label: 'Últimos 6 meses' },
  { value: 'anio', label: 'Este año' },
]

function rangeStart(range: Range): Date {
  const now = new Date()
  switch (range) {
    case 'mes':
      return new Date(now.getTime() - 30 * 864e5)
    case '3meses':
      return new Date(now.getTime() - 90 * 864e5)
    case '6meses':
      return new Date(now.getTime() - 180 * 864e5)
    case 'anio':
      return new Date(now.getFullYear(), 0, 1)
  }
}

/** Lunes 00:00 de la semana que contiene `d`. */
function startOfWeek(d: Date): Date {
  const x = new Date(d)
  const dow = (x.getDay() + 6) % 7 // 0 = lunes
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - dow)
  return x
}

const fmtDia = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' })

function buildWeeklyPoints(
  postulaciones: DashboardMetrics['postulaciones'],
  range: Range,
  puestoId: string,
): ChartPoint[] {
  const from = startOfWeek(rangeStart(range))
  const now = new Date()

  // Genera todas las semanas del rango (aunque tengan 0 postulaciones).
  const weeks: number[] = []
  for (let t = new Date(from); t <= now; t.setDate(t.getDate() + 7)) {
    weeks.push(t.getTime())
  }
  const counts = new Map<number, number>(weeks.map((w) => [w, 0]))

  const fromTime = from.getTime()
  for (const p of postulaciones) {
    if (puestoId && p.puesto_id !== puestoId) continue
    const fecha = new Date(p.fecha_postulacion)
    if (fecha.getTime() < fromTime) continue
    const key = startOfWeek(fecha).getTime()
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return weeks.map((w) => {
    const label = fmtDia.format(new Date(w))
    return { label, fullLabel: `Semana del ${label}`, value: counts.get(w) ?? 0 }
  })
}

export function MetricasCliente({ metrics }: { metrics: DashboardMetrics }) {
  const [puestoId, setPuestoId] = useState('')
  const [range, setRange] = useState<Range>('mes')

  const puestoOpts = [
    { value: '', label: 'Todos los puestos' },
    ...metrics.puestosActivosList.map((p) => ({ value: p.id, label: p.titulo })),
  ]

  const points = useMemo(
    () => buildWeeklyPoints(metrics.postulaciones, range, puestoId),
    [metrics.postulaciones, range, puestoId],
  )

  // Tasa de revisión del puesto seleccionado (reacciona sólo al selector de puesto).
  const tasa = useMemo(() => {
    if (!puestoId) return null
    const delPuesto = metrics.postulaciones.filter((p) => p.puesto_id === puestoId)
    const total = delPuesto.length
    const revisadas = delPuesto.filter((p) => p.estado !== 'ENVIADA').length
    const pct = total === 0 ? 0 : Math.round((revisadas / total) * 1000) / 10
    return { pct, total, revisadas, pendientes: total - revisadas }
  }, [metrics.postulaciones, puestoId])

  const ranking = metrics.ranking
  const promedio = metrics.promedioPorPuesto

  return (
    <div className="space-y-5">
      {/* ── Bloque 2 · Gráfico de postulaciones ─────────────────────────── */}
      <Card padding="lg">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-heading text-[17px] font-semibold text-ink">Postulaciones recibidas</h3>
            <p className="mt-0.5 text-[12px]" style={{ color: HINT }}>
              Evolución semanal de candidatos que se postularon.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="w-full sm:w-52">
              <Select
                options={puestoOpts}
                value={puestoId}
                onChange={(e) => setPuestoId(e.target.value)}
                aria-label="Filtrar gráfico por puesto"
              />
            </div>
            <div className="w-full sm:w-40">
              <Select
                options={RANGE_OPTS}
                value={range}
                onChange={(e) => setRange(e.target.value as Range)}
                aria-label="Filtrar gráfico por rango de fechas"
              />
            </div>
          </div>
        </div>
        <PostulacionesLineChart points={points} />
      </Card>

      {/* ── Bloque 3 · Tasa de revisión + Promedio con ranking ──────────── */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        {/* Columna izquierda — Tasa de revisión */}
        <Card padding="lg">
          <p className="text-[13px] font-medium" style={{ color: LABEL }}>
            Tasa de revisión
          </p>

          {tasa === null ? (
            <p className="mt-4 text-[13px]" style={{ color: HINT }}>
              Seleccioná un puesto para ver esta métrica.
            </p>
          ) : tasa.total === 0 ? (
            <p className="mt-4 text-[13px]" style={{ color: HINT }}>
              Este puesto todavía no recibió postulaciones.
            </p>
          ) : (
            <>
              <p className="mt-2 font-heading text-[40px] font-semibold leading-none text-ink">
                {tasa.pct.toFixed(1)}
                <span className="ml-0.5 text-[24px]">%</span>
              </p>
              <ProgressBar value={tasa.pct} showValue={false} className="mt-4" />
              <div className="mt-3 flex items-center justify-between text-[12px]">
                <span style={{ color: OVER }}>
                  <span className="font-semibold tabular-nums">{tasa.revisadas}</span> revisadas
                </span>
                <span style={{ color: tasa.pendientes > 0 ? UNDER : HINT }}>
                  <span className="font-semibold tabular-nums">{tasa.pendientes}</span> sin revisar
                </span>
                <span style={{ color: HINT }}>
                  <span className="font-semibold tabular-nums">{tasa.total}</span> en total
                </span>
              </div>
            </>
          )}

          <p className="mt-4 border-t border-neutral-100 pt-4 text-[12px] leading-relaxed" style={{ color: HINT }}>
            Mide qué porcentaje de los candidatos que se postularon ya fueron revisados. Un número bajo
            puede indicar que el puesto recibe más postulaciones de las que podés atender.
          </p>
        </Card>

        {/* Columna derecha — Promedio por puesto + ranking */}
        <Card padding="lg">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[13px] font-medium" style={{ color: LABEL }}>
              Promedio por puesto
            </p>
            {ranking.length > 0 && (
              <span className="text-[11px]" style={{ color: HINT }}>
                {ranking.length} {ranking.length === 1 ? 'puesto activo' : 'puestos activos'}
              </span>
            )}
          </div>
          <p className="mt-2 font-heading text-[40px] font-semibold leading-none text-ink">
            {promedio.toFixed(1)}
          </p>
          <p className="mt-4 text-[12px] leading-relaxed" style={{ color: HINT }}>
            Promedio de candidatos por cada búsqueda activa. Usalo como referencia para detectar puestos
            que no atraen candidatos o que están saturados.
          </p>

          {ranking.length > 0 && (
            <div className="mt-4 border-t border-neutral-100 pt-4">
              <ul className="max-h-[300px] space-y-1.5 overflow-y-auto pr-1">
                {ranking.map((p, i) => {
                  const arriba = p.total > promedio
                  const prev = ranking[i - 1]
                  // Línea de referencia visual entre los que superan el promedio y los que no.
                  const showRef = i > 0 && prev.total > promedio && !arriba
                  return (
                    <li key={p.id}>
                      {showRef && (
                        <div className="my-1.5 flex items-center gap-2" aria-hidden>
                          <span className="h-px flex-1" style={{ background: HINT, opacity: 0.5 }} />
                          <span className="text-[10px] font-medium" style={{ color: HINT }}>
                            promedio {promedio.toFixed(1)}
                          </span>
                          <span className="h-px flex-1" style={{ background: HINT, opacity: 0.5 }} />
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-3 text-[13px]">
                        <span className="truncate text-ink-soft">{p.titulo}</span>
                        <span
                          className="flex-none font-semibold tabular-nums"
                          style={{ color: arriba ? OVER : UNDER }}
                        >
                          {p.total} {p.total === 1 ? 'postulación' : 'postulaciones'}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
