/**
 * Normalización de texto para búsquedas y filtros.
 *
 * Los catálogos de MiLiors están escritos con la ortografía correcta
 * ("Ingeniería", "Administración", "Inglés"), pero nadie escribe tildes cuando
 * busca. Sin normalizar, tipear "ingenieria" en el combobox no matchea nada y
 * el usuario cree que su carrera no existe.
 *
 * Compara sin tildes, sin diéresis y sin distinguir mayúsculas. La `ñ` se
 * conserva: en castellano es una letra propia, no una `n` acentuada, y
 * confundirlas haría que "año" matchee "ano".
 */

/** Marcas diacríticas de combinación (Unicode) menos la tilde de la `ñ`. */
const DIACRITICOS = /[\u0300-\u036f]/g
const ENIE = /\u0303/g

export function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    // Se reconstruye la ñ/Ñ antes de barrer el resto de los diacríticos.
    .replace(/n\u0303/g, 'ñ')
    .replace(/N\u0303/g, 'Ñ')
    .replace(ENIE, '')
    .replace(DIACRITICOS, '')
    .toLowerCase()
    .trim()
}

/** `true` si `texto` contiene `consulta`, ignorando tildes y mayúsculas. */
export function coincideBusqueda(texto: string, consulta: string): boolean {
  const q = normalizarTexto(consulta)
  return q === '' || normalizarTexto(texto).includes(q)
}

/** `true` si ambos textos son el mismo, ignorando tildes y mayúsculas. */
export function mismoTexto(a: string, b: string): boolean {
  return normalizarTexto(a) === normalizarTexto(b)
}

/**
 * Variantes acentuadas de cada letra base, para armar clases de caracteres.
 * La `ñ` no está: se busca tal cual se escribe.
 */
const VARIANTES: Record<string, string> = {
  a: 'aáàäâã',
  e: 'eéèëê',
  i: 'iíìïî',
  o: 'oóòöôõ',
  u: 'uúùüû',
  c: 'cç',
}

/**
 * Convierte una búsqueda libre en una expresión regular de Postgres que ignora
 * las tildes: "ingenieria" pasa a `[iíìïî]ngen[iíìïî]er[iíìïî]a` y matchea
 * "Ingeniería".
 *
 * Hace falta porque `ilike` en Postgres ignora mayúsculas pero NO tildes: los
 * buscadores del servidor (puestos, postulantes, postulaciones) devolvían cero
 * resultados apenas el usuario escribía sin acentos, que es como escribe todo
 * el mundo. Se usa con el operador `~*` (`regexIMatch` en supabase-js).
 *
 * Todo lo que no sea letra, número o espacio se escapa, así una búsqueda con
 * `.` o `(` no se interpreta como sintaxis de regex.
 */
export function patronSinTildes(consulta: string): string {
  return Array.from(normalizarTexto(consulta))
    .map((ch) => {
      const variantes = VARIANTES[ch]
      if (variantes) return `[${variantes}]`
      return /[a-z0-9ñ ]/.test(ch) ? ch : '\\' + ch
    })
    .join('')
}

/**
 * Como `patronSinTildes`, pero anclado: compara el texto ENTERO y no un pedazo.
 *
 * Es la diferencia entre promover "Derecho" y llevarse puesto de paso a todos
 * los que escribieron "Derecho del Trabajo".
 */
export function patronTextoCompleto(texto: string): string {
  return `^${patronSinTildes(texto)}$`
}
