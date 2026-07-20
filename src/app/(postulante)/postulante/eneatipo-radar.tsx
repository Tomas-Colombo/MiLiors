'use client'

const NOMBRES: Record<number, [string, string]> = {
  1: ['El', 'reformador'],
  2: ['El', 'ayudador'],
  3: ['El', 'triunfador'],
  4: ['El', 'individualista'],
  5: ['El', 'investigador'],
  6: ['El', 'leal'],
  7: ['El', 'entusiasta'],
  8: ['El', 'desafiador'],
  9: ['El', 'pacificador'],
}

type PuntajePorEneatipo = { eneatipo_numero: number; puntaje_crudo: number }

interface Props {
  puntajes: PuntajePorEneatipo[]
  /** Eneatipo(s) dominante(s) a destacar — debe coincidir 1:1 con lo mostrado en el perfil de personalidad. */
  dominantes?: number[]
  size?: number
}

const N = 9
const ANGLE_STEP = (2 * Math.PI) / N
const START_ANGLE = -Math.PI / 2

function polarToXY(cx: number, cy: number, r: number, angleIndex: number) {
  const angle = START_ANGLE + angleIndex * ANGLE_STEP
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  }
}

export function EneatipoRadar({ puntajes, dominantes = [], size = 480 }: Props) {
  const dominantesSet = new Set(dominantes)
  // Padding around the radar to leave room for labels
  const pad = size * 0.24
  const cx = size / 2
  const cy = size / 2
  const maxR = (size - 2 * pad) / 2    // radar occupies the inner circle
  const labelR = maxR + pad * 0.72      // labels float just outside the radar

  const scoreMap: Record<number, number> = {}
  for (const p of puntajes) {
    scoreMap[p.eneatipo_numero] = p.puntaje_crudo
  }
  const maxScore = Math.max(...Object.values(scoreMap), 1)
  const normalized = (num: number) => Math.max((scoreMap[num] ?? 0) / maxScore, 0.08)

  // Radar polygon
  const radarPoints = Array.from({ length: N }, (_, i) => {
    const r = normalized(i + 1) * maxR
    return polarToXY(cx, cy, r, i)
  })
  const radarPath =
    radarPoints.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') + ' Z'

  // Reference rings
  const rings = [0.33, 0.66, 1]

  // Axes
  const axes = Array.from({ length: N }, (_, i) => {
    const end = polarToXY(cx, cy, maxR, i)
    return { x2: end.x, y2: end.y }
  })

  // Label positions + text-anchor based on angle quadrant
  const labels = Array.from({ length: N }, (_, i) => {
    const enNum = i + 1
    const { x, y } = polarToXY(cx, cy, labelR, i)
    const angleDeg = ((START_ANGLE + i * ANGLE_STEP) * 180) / Math.PI
    let anchor: 'start' | 'middle' | 'end' = 'middle'
    // left half  → end (right-align text so it doesn't run off left edge)
    // right half → start (left-align so it doesn't run off right edge)
    // top/bottom → middle
    if (angleDeg > -150 && angleDeg < -30) anchor = 'middle'        // top arc
    else if (angleDeg >= -30 && angleDeg < 75) anchor = 'start'     // right arc
    else if (angleDeg >= 75 && angleDeg < 105) anchor = 'middle'    // bottom right
    else if (angleDeg >= 105 && angleDeg < 150) anchor = 'end'      // bottom-right → left
    else anchor = 'end'                                               // left arc

    return { x, y, anchor, num: String(enNum), parts: NOMBRES[enNum] }
  })

  const numSize = size * 0.038
  const wordSize = size * 0.026

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      height="100%"
      overflow="visible"
      aria-label="Distribución de los 9 eneatipos"
      role="img"
    >
      {/* Reference rings */}
      {rings.map((r, idx) => {
        const pts = Array.from({ length: N }, (_, i) => polarToXY(cx, cy, r * maxR, i))
        const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ') + ' Z'
        return (
          <path
            key={idx}
            d={d}
            fill="none"
            stroke="#E8E4FF"
            strokeWidth={idx === 2 ? 1.5 : 1}
            strokeDasharray={idx === 2 ? undefined : '3 3'}
            style={{ stroke: 'var(--color-chart-grid)' }}
          />
        )
      })}

      {/* Axes */}
      {axes.map((ax, i) => (
        <line key={i} x1={cx} y1={cy} x2={ax.x2.toFixed(2)} y2={ax.y2.toFixed(2)} strokeWidth={1} style={{ stroke: 'var(--color-chart-grid)' }} />
      ))}

      {/* User polygon */}
      <path d={radarPath} fill="rgba(91,79,232,0.13)" stroke="#5B4FE8" strokeWidth={2} strokeLinejoin="round" />

      {/* Vertex dots — los dominantes se destacan con un anillo y radio mayor */}
      {radarPoints.map((p, i) => {
        const esDominante = dominantesSet.has(i + 1)
        return (
          <g key={i}>
            {esDominante && (
              <circle cx={p.x.toFixed(2)} cy={p.y.toFixed(2)} r={7} fill="none" stroke="#5B4FE8" strokeWidth={1.5} opacity={0.35} />
            )}
            <circle
              cx={p.x.toFixed(2)}
              cy={p.y.toFixed(2)}
              r={esDominante ? 5 : 3.5}
              fill="#5B4FE8"
              stroke="white"
              strokeWidth={1.5}
            />
          </g>
        )
      })}

      {/* Labels — number + two-line name; dominantes en negrita y color más oscuro */}
      {labels.map((l) => {
        const esDominante = dominantesSet.has(Number(l.num))
        return (
          <text key={l.num} textAnchor={l.anchor} fontFamily="var(--font-sans), system-ui, sans-serif">
            {/* Eneatipo number */}
            <tspan
              x={l.x.toFixed(2)}
              y={(l.y - wordSize * 1.1).toFixed(2)}
              fontSize={esDominante ? numSize * 1.15 : numSize}
              fontWeight={700}
              fontFamily="var(--font-heading), Georgia, serif"
              style={{ fill: 'var(--color-accent-violet)' }}
            >
              {l.num}
            </tspan>
            {/* "El" */}
            <tspan
              x={l.x.toFixed(2)}
              y={(l.y + wordSize * 0.4).toFixed(2)}
              fontSize={wordSize}
              fontWeight={esDominante ? 700 : 400}
              style={{ fill: esDominante ? 'var(--color-ink)' : 'var(--color-muted)' }}
            >
              {l.parts[0]}
            </tspan>
            {/* noun */}
            <tspan
              x={l.x.toFixed(2)}
              y={(l.y + wordSize * 0.4 + wordSize * 1.35).toFixed(2)}
              fontSize={wordSize}
              fontWeight={esDominante ? 700 : 400}
              style={{ fill: esDominante ? 'var(--color-ink)' : 'var(--color-muted)' }}
            >
              {l.parts[1]}
            </tspan>
          </text>
        )
      })}
    </svg>
  )
}
