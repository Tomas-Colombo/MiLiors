/**
 * Tipos del Informe de Personalidad (rediseño 2026).
 *
 * La salida se compone de dos partes:
 *   - Motor determinístico (src/modules/informe/competencias.ts): mapa de los 9
 *     eneatipos, las 13 competencias con nivel + barras, top-4 y estilos.
 *   - Prosa del LLM (una sola llamada): descripciones en 3ª persona.
 *
 * `InformePersonalidadJSON` es la forma final que se guarda en
 * `informe_personalidad.contenido_json` (jsonb) y alimenta el visor y el PDF.
 */

/**
 * Los 5 niveles del informe, de mayor a menor. Es una lista en runtime y no
 * solo un tipo porque el filtro de admin y los reportes necesitan iterarlos y
 * validarlos: cuando esto era únicamente un tipo, el filtro "Nivel mostrado"
 * validaba contra NIVEL_COMPETENCIA de constants/enums (BASICO/INTERMEDIO/
 * AVANZADO, que son los de las habilidades técnicas del perfil) y descartaba
 * en silencio cualquier valor. Dos enums distintos con el mismo nombre.
 */
export const NIVELES_INFORME = ['Alto', 'Medio-Alto', 'Medio', 'Medio-Bajo', 'Bajo'] as const

export type NivelCompetencia = (typeof NIVELES_INFORME)[number]

/** Los 4 bloques en los que se agrupan las 13 competencias para el render. */
export type BloqueCompetencia =
  | 'Cómo decide y lidera'
  | 'Cómo se relaciona'
  | 'Cómo piensa y resuelve'
  | 'Cómo ejecuta y se sostiene'

export type MapaPersonalidadItem = {
  eneatipo: number
  nombre: string
  score: number
}

export type CompetenciaItem = {
  bloque: BloqueCompetencia
  nombre: string
  nivel: NivelCompetencia
  /** 1-5 posiciones llenas. */
  barras: number
  /** Línea descriptiva en 3ª persona (prosa del LLM). */
  descripcion: string
}

export type TalentoItem = {
  nombre: string
  descripcion: string
}

export type ComoTrabajasItem = {
  titulo: string
  texto: string
}

/** Forma final persistida en `informe_personalidad.contenido_json`. */
export type InformePersonalidadJSON = {
  nombre: string
  subtitulo: string
  descripcionPersonalidad: string
  /** 9 filas — del motor. */
  mapaPersonalidad: MapaPersonalidadItem[]
  /** 13 competencias, agrupadas por bloque — nivel/barras del motor, descripción del LLM. */
  competencias: CompetenciaItem[]
  /** 4 talentos — del top-4 del motor. */
  talentosTop: TalentoItem[]
  /** 8-9 ítems de estilo — del LLM. */
  comoTrabajas: ComoTrabajasItem[]
}

/**
 * Prosa que devuelve el LLM en su única llamada. El motor ya resolvió números,
 * niveles y rankings; el LLM SOLO escribe texto y lo referencia por `nombre`.
 */
export type InformeProseLLM = {
  subtitulo: string
  descripcionPersonalidad: string
  /** Una línea por competencia (13), referida por `nombre`. */
  competenciasDesc: { nombre: string; descripcion: string }[]
  /** Un párrafo por talento (4), referido por `nombre`. */
  talentosDesc: { nombre: string; descripcion: string }[]
  /** 8-9 ítems, en el orden de COMO_TRABAJAS_TITULOS. */
  comoTrabajas: ComoTrabajasItem[]
}
