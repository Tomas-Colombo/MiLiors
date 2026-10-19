/**
 * Recorte de texto para armar prompts de IA.
 *
 * Un `slice(0, n)` ciego corta a mitad de palabra o de oración, y el modelo
 * recibe un fragmento que puede decir lo contrario de lo que decía el texto
 * completo (o perder justo el requisito que estaba al final). Este helper corta
 * siempre en un límite natural.
 */

/** Terminadores de oración, seguidos opcionalmente por comillas o paréntesis de cierre. */
const FIN_DE_ORACION = /[.!?…]+["'”’»)\]]*(?=\s|$)/g

/** Fracción mínima de `max` que debe conservar un corte por oración. */
const UMBRAL_MINIMO = 0.5

/**
 * Recorta `texto` a lo sumo `max` caracteres, sin partir una oración.
 *
 * - Si el texto entra, lo devuelve entero (sin espacios en los extremos).
 * - Si no, corta en el último terminador de oración (. ! ? …, con comillas o
 *   paréntesis de cierre opcionales) que termine dentro de `max`. Un punto dentro
 *   de un número o de una sigla pegada ("3.5", "S.A.S") no cuenta: el terminador
 *   debe estar seguido de un espacio o del final del texto.
 * - Si no hay terminador dentro de `max`, o el corte dejaría menos de la mitad
 *   de `max`, corta en el último espacio y agrega "…". El resultado nunca supera
 *   `max` y, para un texto no vacío con `max` >= 1, nunca es vacío.
 */
export function recortarEnOracion(texto: string, max: number): string {
  const limpio = texto.trim()
  if (max <= 0) return ''
  if (limpio.length <= max) return limpio

  let finOracion = -1
  for (const m of limpio.matchAll(FIN_DE_ORACION)) {
    const fin = m.index + m[0].length
    if (fin > max) break
    finOracion = fin
  }
  // Una oración corta al principio ("1.", "Sr.") no sirve de corte: se descarta
  // si conserva menos de la mitad del máximo y se cae al corte por palabra.
  if (finOracion >= max * UMBRAL_MINIMO) return limpio.slice(0, finOracion)

  // Sin oración completa: se corta en una palabra entera y se marca el recorte.
  // Se reserva un carácter para la elipsis.
  const tope = Math.max(max - 1, 0)
  let corte = limpio.slice(0, tope)
  if (!/\s/.test(limpio.charAt(tope))) {
    const ultimoEspacio = corte.search(/\s\S*$/)
    if (ultimoEspacio > 0) corte = corte.slice(0, ultimoEspacio)
  }
  // Una coma o dos puntos colgando antes de la elipsis queda mal.
  corte = corte.trimEnd().replace(/[,;:\-–—]+$/, '').trimEnd()
  return corte ? `${corte}…` : limpio.slice(0, max)
}
