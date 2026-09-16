/**
 * Tipos de la síntesis integrada del certificado.
 *
 * El certificado combina el Informe de Personalidad (condensado) con el perfil
 * técnico (formación, cursos, experiencia, competencias e idiomas) en una prosa en 3ª
 * persona. El LLM SOLO devuelve prosa y la lista de competencias que logró
 * integrar; el código calcula las NO integradas (garantía anti-pérdida)
 * restando las integradas del total de competencias técnicas vigentes.
 *
 * El LLM no arma el PDF ni calcula nada: el motor del informe ya resolvió
 * niveles y rankings, y las duraciones de experiencia se calculan acá.
 */

/** Un cruce concreto entre un rasgo de personalidad y evidencia del perfil técnico. */
export type SintesisFortaleza = {
  /** Título corto (2-5 palabras). */
  titulo: string
  /** 3-4 oraciones en 3ª persona: el rasgo aterrizado en experiencia real. */
  texto: string
}

/**
 * Un ítem del perfil técnico que el triage dejó fuera del certificado por no
 * aportar evidencia para la búsqueda declarada (el clásico "quiere programar y
 * carga tres años volando aviones").
 *
 * Guardamos qué se descartó y por qué: el certificado es un documento firmado y
 * el postulante tiene que poder ver por qué su ítem no está, sin adivinar.
 */
export type SintesisDescarte = {
  /** id de la formación/curso/experiencia, o el nombre exacto de la competencia. */
  clave: string
  tipo: 'formacion' | 'curso' | 'experiencia' | 'competencia'
  /** Etiqueta legible para mostrarle al postulante qué ítem es. */
  label: string
  /** Por qué no aporta a la búsqueda declarada. */
  motivo: string
}

/**
 * Versión del esquema de la síntesis. Al subirla, las síntesis generadas con el
 * esquema anterior quedan marcadas como desactualizadas y el postulante ve el
 * botón para regenerarlas (mismo mecanismo que cuando el informe queda más nuevo).
 *
 * Nada se regenera solo: subir la versión sólo habilita el botón.
 *
 * 6 — El párrafo ya no recibe la antigüedad total ni las horas de los cursos, y
 *     el prompt dejó de ordenarle citar duraciones que tenía prohibido escribir.
 *     La respuesta del modelo se reduce a `perfilIntegrado`.
 */
export const SINTESIS_VERSION = 6

/** Salida del LLM + metadata, persistida en `perfil_tecnico.sintesis_certificado`. */
export type CertificadoSintesisJSON = {
  /** Un párrafo en 3ª persona: la síntesis de personalidad que se imprime. */
  perfilIntegrado: string
  /**
   * NO se generan más (el prompt dejó de pedirlas en v5; ninguna vista las
   * renderizaba). Siguen declaradas y opcionales porque las filas v2-v4
   * guardadas sí las traen y `certificado/queries.ts` las lee de ahí: sacarlas
   * del tipo haría que esas síntesis dejaran de deserializar completas.
   *
   * Es lo único que sobrevive de aquel esquema. El parseo de la respuesta del
   * modelo sí se eliminó, que es otra cosa: el prompt no las pide, así que
   * parsearlas era buscar algo que nunca venía.
   */
  fortalezas?: SintesisFortaleza[]
  /** Mismo caso que [[fortalezas]]: se lee de filas viejas, no se genera. */
  contextoIdeal?: string
  /**
   * "¿Qué estudiaste / qué buscás?" del perfil, congelado al generar: es el eje
   * contra el que se midió la relevancia de todo lo demás. Ausente antes de v3.
   */
  objetivo?: string
  /**
   * Ítems del perfil técnico que NO van al certificado. Es una lista de EXCLUSIÓN
   * a propósito: lo que el postulante cargue después de generar la síntesis se
   * muestra igual (nunca desaparece en silencio), y sólo se oculta lo que el
   * triage evaluó y descartó. Ausente antes de v3 = no hubo triage, va todo.
   */
  descartados?: SintesisDescarte[]
  /** ISO de cuándo se generó — para detectar si el informe quedó más nuevo (desactualizada). */
  generadaAt?: string
  /** Esquema con el que se generó. Ausente (o 1) = esquema viejo, sin fortalezas ni contexto. */
  version?: number
}

export type SintesisEstado = 'PENDIENTE' | 'LISTO' | 'ERROR'

/** Comparación de claves tolerante a mayúsculas/espacios (competencias vienen por nombre). */
function normClave(s: string): string {
  return s.trim().toLowerCase()
}

/** Claves descartadas de un tipo, listas para filtrar el perfil técnico vigente. */
export function clavesDescartadas(
  descartados: SintesisDescarte[] | undefined,
  tipo: SintesisDescarte['tipo'],
): Set<string> {
  return new Set((descartados ?? []).filter(d => d.tipo === tipo).map(d => normClave(d.clave)))
}

/** `true` si la clave quedó fuera del certificado. */
export function estaDescartada(claves: Set<string>, clave: string): boolean {
  return claves.has(normClave(clave))
}
