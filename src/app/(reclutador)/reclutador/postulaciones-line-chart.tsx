'use client'

import { useState } from 'react'

export type ChartPoint = {
  /** Etiqueta corta para el eje X (ej. "7 jul"). */
  label: string
  /** Etiqueta completa para el tooltip (ej. "Semana del 7 jul"). */
  fullLabel: string
  value: number
}

const VB_W = 660
const VB_H = 240
const PAD_L = 34
const PAD_R = 16
const PAD_T = 18
const PAD_B = 34

/**
 * Gráfico de líneas SVG sin dependencias. Una sola serie, eje X con etiquetas
 * de semana y tooltip al hover. Se adapta al ancho del contenedor vía viewBox.
 */
export function PostulacionesLineChart({ points }: { points: ChartPoint[] }) {
  const [active, setActive] = useState<number | null>(null)

  const maxValue = Math.max(1, ...points.map((p) => p.value))
  const plotW = VB_W - PAD_L - PAD_R
  const plotH = VB_H - PAD_T - PAD_B

  const x = (i: number) =>
    points.length <= 1 ? PAD_L + plotW / 2 : PAD_L + (i / (points.length - 1)) * plotW
  const y = (v: number) => PAD_T + plotH - (v / maxValue) * plotH

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.value)}`).join(' ')
  const areaPath =
    points.length > 0
      ? `${linePath} L ${x(points.length - 1)} ${PAD_T + plotH} L ${x(0)} ${PAD_T + plotH} Z`
      : ''

  // Líneas de guía horizontales (0, mitad, máximo).
  const yTicks = [0, Math.round(maxValue / 2), maxValue].filter((v, i, a) => a.indexOf(v) === i)

  // Cuántas etiquetas del eje X mostrar sin amontonar.
  const labelStep = Math.max(1, Math.ceil(points.length / 8))

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-auto" role="img" aria-label="Postulaciones por semana">
        <defs>
          <linearGradient id="lc-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary-600)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--color-primary-600)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Guías horizontales + valores del eje Y */}
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={PAD_L}
              x2={VB_W - PAD_R}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--color-neutral-200)"
              strokeWidth={1}
            />
            <text
              x={PAD_L - 8}
              y={y(v) + 4}
              textAnchor="end"
              className="fill-neutral-400"
              style={{ fontSize: 11 }}
            >
              {v}
            </text>
          </g>
        ))}

        {/* Área bajo la línea */}
        {areaPath && <path d={areaPath} fill="url(#lc-area)" />}

        {/* Línea */}
        {points.length > 1 && (
          <path d={linePath} fill="none" stroke="var(--color-primary-600)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        )}

        {/* Puntos + etiquetas del eje X + zonas de hover */}
        {points.map((p, i) => {
          const isActive = active === i
          const showLabel = i % labelStep === 0 || i === points.length - 1
          return (
            <g key={i}>
              {showLabel && (
                <text
                  x={x(i)}
                  y={VB_H - 12}
                  textAnchor="middle"
                  className="fill-neutral-400"
                  style={{ fontSize: 11 }}
                >
                  {p.label}
                </text>
              )}
              {isActive && (
                <line
                  x1={x(i)}
                  x2={x(i)}
                  y1={PAD_T}
                  y2={PAD_T + plotH}
                  stroke="var(--color-primary-300)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              )}
              <circle
                cx={x(i)}
                cy={y(p.value)}
                r={isActive ? 5 : points.length > 40 ? 0 : 3}
                fill="var(--color-surface)"
                stroke="var(--color-primary-600)"
                strokeWidth={2}
              />
              {/* Banda invisible para capturar el hover */}
              <rect
                x={x(i) - (points.length > 1 ? plotW / (points.length - 1) / 2 : plotW / 2)}
                y={PAD_T}
                width={points.length > 1 ? plotW / (points.length - 1) : plotW}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive((cur) => (cur === i ? null : cur))}
              />
            </g>
          )
        })}
      </svg>

      {/* Tooltip */}
      {active !== null && points[active] && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-neutral-300 bg-neutral-0 px-3 py-2 shadow-md"
          style={{ left: `${(x(active) / VB_W) * 100}%`, top: `${(y(points[active].value) / VB_H) * 100 - 2}%` }}
        >
          <div className="text-[11px] text-muted whitespace-nowrap">{points[active].fullLabel}</div>
          <div className="text-[15px] font-bold text-ink">
            {points[active].value}{' '}
            <span className="text-[11px] font-medium text-muted">
              {points[active].value === 1 ? 'postulación' : 'postulaciones'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
