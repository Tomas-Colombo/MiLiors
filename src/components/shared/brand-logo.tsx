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
  const ancho = Math.round(size * RATIO)

  return (
    <Image
      src="/brand/miliors-isotipo.png"
      alt={alt}
      width={ancho}
      height={size}
      loading={lazy ? 'lazy' : 'eager'}
      // Las dos dimensiones van explícitas en el estilo, con el mismo entero que
      // va en los atributos. Van como estilo y no sólo como atributos porque el
      // atributo lo pisa cualquier clase.
      //
      // `width: 'auto'` —que es lo que recomienda el warning de next/image— acá
      // no alcanza, y conviene saber por qué antes de "simplificarlo" de vuelta:
      // el optimizador redondea el alto de cada variante a entero, así que
      // ninguna conserva exactamente 512/441. w=32 sirve 32x28 (1.14286),
      // w=48 sirve 48x41 (1.17073), w=96 sirve 96x83 (1.15663). Con `auto` el
      // ancho renderizado sale del ratio de la variante que cargó, mientras que
      // el atributo `width` sale del ratio exacto: cuando los dos redondeos caen
      // en enteros distintos, next/image avisa que se modificó una sola de las
      // dos dimensiones. Y como qué variante carga depende del DPR y del
      // viewport, el aviso aparecía de forma intermitente.
      //
      // Fijando el ancho, lo renderizado y el atributo coinciden siempre.
      // `object-contain` se queda para absorber la fracción de píxel entre ese
      // entero y la proporción real, sin deformar el isotipo.
      style={{ height: size, width: ancho }}
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
