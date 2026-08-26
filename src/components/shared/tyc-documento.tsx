import { cn } from '@/lib/utils'

/**
 * Ancho único del diálogo de Términos y Condiciones, para que el bloqueante y
 * el de sólo lectura se vean igual.
 */
export const TYC_MODAL_WIDTH = 640

/**
 * Render único del texto de los Términos y Condiciones.
 *
 * El contenido lo carga el administrador desde un `<textarea>`, así que es
 * texto plano: `whitespace-pre-wrap` es lo que conserva los saltos de línea y
 * los párrafos que escribió. Sin eso el documento entero se lee como un solo
 * bloque corrido.
 *
 * `break-words` evita que una URL o una palabra larguísima sin espacios estire
 * el contenedor y deforme el diálogo.
 *
 * El scroll NO se define acá: lo pone el contenedor según el contexto (el
 * diálogo ya limita su propia altura; el historial del admin usa su tope).
 */
export function TyCDocumento({
  descripcion,
  className,
}: {
  descripcion: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'whitespace-pre-wrap break-words text-[13.5px] leading-relaxed text-soft',
        className
      )}
    >
      {descripcion}
    </div>
  )
}
