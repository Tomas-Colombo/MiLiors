/**
 * Trazos animados del panel derecho del login.
 *
 * Port del componente `FloatingPaths` (framer-motion) a SVG + CSS: las props
 * `pathLength` / `pathOffset` que anima framer-motion no son más que
 * `stroke-dasharray` y `stroke-dashoffset` normalizados, y con
 * `pathLength="1"` en cada trazo se obtiene lo mismo sin sumar una librería de
 * animación ni JavaScript de cliente a la pantalla de acceso.
 *
 * Las duraciones y retardos se derivan del índice, no de `Math.random()`: este
 * árbol se renderiza dentro de un componente cliente, y un valor aleatorio
 * distinto en servidor y cliente rompería la hidratación.
 *
 * El `preserveAspectRatio` queda en su valor por defecto (`xMidYMid meet`) a
 * propósito: con `slice` el viewBox de 696×316 se escala hasta llenar un panel
 * alto y los trazos pasan de filamentos a cintas. Con `meet` la escala la fija
 * el ancho, los trazos quedan finos, y las curvas que se salen del viewBox se
 * siguen viendo porque el recorte lo hace el borde del <svg>, no el viewBox.
 */

const PATH_COUNT = 36

type Direction = 1 | -1

function buildPaths(direction: Direction) {
  return Array.from({ length: PATH_COUNT }, (_, i) => {
    const dx = i * 5 * direction
    return {
      id: `${direction}-${i}`,
      d:
        `M-${380 - dx} -${189 + i * 6}` +
        `C-${380 - dx} -${189 + i * 6} -${312 - dx} ${216 - i * 6} ${152 - dx} ${343 - i * 6}` +
        `C${616 - dx} ${470 - i * 6} ${684 - dx} ${875 - i * 6} ${684 - dx} ${875 - i * 6}`,
      width: 0.5 + i * 0.03,
      // Rampa contenida: el original llega a opacidad 1 y sobre el navy del
      // panel eso tapa el fondo en vez de acompañarlo.
      opacityLow: 0.04 + i * 0.008,
      opacityHigh: 0.1 + i * 0.014,
      duration: 20 + ((i * 7) % 11),
      delay: -((i * 3) % 20),
    }
  })
}

function PathLayer({ direction }: { direction: Direction }) {
  return (
    <svg
      className="tid-paths-svg"
      viewBox="0 0 696 316"
      fill="none"
      aria-hidden
      focusable="false"
    >
      {buildPaths(direction).map((path) => (
        <path
          key={path.id}
          d={path.d}
          pathLength={1}
          strokeWidth={path.width}
          style={
            {
              '--dur': `${path.duration}s`,
              '--delay': `${path.delay}s`,
              '--op-lo': String(path.opacityLow),
              '--op-hi': String(path.opacityHigh),
            } as React.CSSProperties
          }
        />
      ))}
    </svg>
  )
}

/** Dos capas cruzadas: una avanza hacia la derecha y la otra hacia la izquierda. */
export function FloatingPaths() {
  return (
    <div className="tid-paths" aria-hidden>
      <PathLayer direction={1} />
      <PathLayer direction={-1} />
    </div>
  )
}
