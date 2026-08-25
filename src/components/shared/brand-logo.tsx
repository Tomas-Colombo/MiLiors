import Image from 'next/image'

/**
 * Marca MiLiors.
 *
 * El isotipo es una imagen (el barrido dorado del logo no se puede reproducir
 * con CSS sin perder el degradado metálico); el wordmark se compone con texto,
 * no con el PNG completo, por dos motivos: el "MiLiors" del archivo original es
 * azul marino sobre transparente y desaparece sobre fondos oscuros, y como
 * texto queda nítido en cualquier tamaño y hereda el color del tema.
 *
 * Único lugar de la app que renderiza el isotipo. Antes había seis `<img>`
 * sueltos apuntando al mismo PNG, cada uno con su `eslint-disable`, sirviendo
 * 43 KB sin optimizar para pintarlo a 26–56 px.
 */

/** Tamaño real del archivo, para que `next/image` calcule bien la proporción. */
const INTRINSECO = { ancho: 512, alto: 441 }
const RATIO = INTRINSECO.ancho / INTRINSECO.alto

type BrandLogoProps = {
  /** Alto del isotipo en px. Si `className` fija el alto por CSS, este valor
   *  sólo define la proporción con la que se pide la imagen. */
  size?: number
  /**
   * Texto alternativo. Por defecto vacío: casi siempre el isotipo va pegado al
   * wordmark en texto, y anunciar "MiLiors" dos veces molesta más que ayudar.
   * Se pasa un alt real sólo cuando el isotipo aparece solo.
   */
  alt?: string
  /**
   * Carga diferida. Va en `false` por defecto —contra el default de
   * `next/image`— porque el isotipo es cromo de página: está siempre dentro del
   * viewport al cargar, así que diferirlo sólo consigue que aparezca tarde.
   * No se usa `preload`: el doc de Next lo reserva para la imagen que es el LCP,
   * y esto pesa 4 KB.
   */
  lazy?: boolean
  className?: string
}

/** Sólo el isotipo dorado. Sirve igual sobre fondo claro y oscuro. */
export function BrandLogo({ size = 44, alt = '', lazy = false, className }: BrandLogoProps) {
  return (
    <Image
      src="/brand/miliors-isotipo.png"
      alt={alt}
      width={Math.round(size * RATIO)}
      height={size}
      loading={lazy ? 'lazy' : 'eager'}
      // `size` manda: alto en px y ancho por proporción. Van como estilo y no
      // sólo como atributos porque el atributo lo pisa cualquier clase, y ahí
      // Next avisa en consola que se modificó una sola de las dos dimensiones.
      style={{ height: size, width: 'auto' }}
      className={['flex-none object-contain', className].filter(Boolean).join(' ')}
    />
  )
}

type BrandLockupProps = {
  /** Alto del isotipo en px; el wordmark escala en proporción. */
  size?: number
  /** Muestra el eslogan bajo el wordmark. */
  tagline?: boolean
  /** Color del wordmark. `inherit` lo deja heredar del contenedor. */
  tone?: 'ink' | 'inverse' | 'inherit'
  className?: string
}

/** Isotipo + wordmark (+ eslogan opcional) en fila. */
export function BrandLockup({
  size = 40,
  tagline = false,
  tone = 'ink',
  className,
}: BrandLockupProps) {
  const color =
    tone === 'ink' ? 'var(--color-primary-700)' : tone === 'inverse' ? '#ffffff' : 'inherit'

  return (
    <div className={['flex items-center gap-2.5', className].filter(Boolean).join(' ')}>
      <BrandLogo size={size} />
      <div className="min-w-0 leading-none">
        <div
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: size * 0.52,
            fontWeight: 600,
            letterSpacing: '-0.015em',
            color,
          }}
        >
          MiLiors
        </div>
        {tagline && (
          <div
            style={{
              marginTop: size * 0.12,
              fontFamily: 'var(--font-heading)',
              fontStyle: 'italic',
              fontSize: size * 0.26,
              color: 'var(--color-gold-700)',
            }}
          >
            Talentos al servicio del mundo
          </div>
        )}
      </div>
    </div>
  )
}
