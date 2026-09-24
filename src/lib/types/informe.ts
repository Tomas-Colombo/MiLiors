/**
 * Tipos del Informe de Personalidad (rediseño 2026).
 *
 * La salida se compone de dos partes:
 *   - Motor determinístico (src/modules/informe/competencias.ts): mapa de los 9
 *     eneatipos, orden de las 13 competencias, fortalezas y focos.
 *   - Prosa del LLM (una sola llamada): las 7 secciones y el anexo del
 *     reclutador, en 3ª persona.
 *
 * `InformePersonalidadJSON` es la forma final que se guarda en
 * `informe_personalidad.contenido_json` (jsonb) y alimenta el visor y el PDF.
 */

/**
 * Los 5 niveles que mostraba el informe hasta la versión 3 (el motor v2 ya no
 * asigna niveles). Quedan porque el feedback histórico los guarda en
 * `nivel_mostrado` y el panel de admin los sigue filtrando.
 *
 * De mayor a menor. Es una lista en runtime y no
 * solo un tipo porque el filtro de admin y los reportes necesitan iterarlos y
 * validarlos: cuando esto era únicamente un tipo, el filtro "Nivel mostrado"
 * validaba contra NIVEL_COMPETENCIA de constants/enums (BASICO/INTERMEDIO/
 * AVANZADO, que son los de las habilidades técnicas del perfil) y descartaba
 * en silencio cualquier valor. Dos enums distintos con el mismo nombre.
 */
export const NIVELES_INFORME = ['Alto', 'Medio-Alto', 'Medio', 'Medio-Bajo', 'Bajo'] as const

export type NivelCompetencia = (typeof NIVELES_INFORME)[number]

/** Los 4 bloques en los que se agrupan las 13 competencias. */
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

/** Referencia a un eneatipo: número y nombre. */
export type EneatipoRef = { numero: number; nombre: string }

/** Los 5 ejes de "Cómo trabaja", en orden de render. */
export const EJES_COMO_TRABAJA = [
  { key: 'liderazgo', titulo: 'Liderazgo' },
  { key: 'decision', titulo: 'Decisión' },
  { key: 'comunicacion', titulo: 'Comunicación' },
  { key: 'equipo', titulo: 'Equipo' },
  { key: 'influencia', titulo: 'Influencia y ventas' },
] as const

export type EjeComoTrabaja = (typeof EJES_COMO_TRABAJA)[number]['key']

/**
 * Prosa que devuelve el LLM en su única llamada: el formato de salida de la
 * especificación v2.0. El motor ya resolvió fortalezas y focos; el LLM los
 * repite en `fortalezas[].competencia` y `planDesarrollo.focos[].competencia`
 * y la fusión exige que coincidan, en el mismo orden.
 */
export type InformeProseLLM = {
  subtitulo: string
  sintesis: string
  fortalezas: { competencia: string; texto: string }[]
  comoTrabaja: Record<EjeComoTrabaja, { estilo: string; dondeCrecer: string }>
  mejorMomento: string
  bajoPresion: string
  ecosistema: { tareas: string[]; puestos: string[]; zonaFriccion: string[] }
  planDesarrollo: {
    focos: { competencia: string; accion: string }[]
    preguntasReflexion: string[]
  }
  /** Solo para el reclutador: nunca se muestra al postulante. */
  anexoReclutador: {
    preguntasSTAR: string[]
    comoAsignarle: string
    queEvitar: string
    senalAlerta: string
  }
}

/**
 * Versión del esquema del informe. Al subirla, los informes generados con el
 * esquema anterior se muestran como "formato anterior" y el postulante ve el
 * botón para regenerarlos — igual que `SINTESIS_VERSION` en el certificado.
 *
 * Nada se regenera solo: subir la versión no dispara ninguna llamada al LLM,
 * solo habilita el botón. La migración la marca el ritmo de cada usuario.
 *
 * 2 — Prosa con tono y extensión según el nivel de cada competencia; sin la
 *     sección de talentos; títulos de "cómo trabaja" en 3ª persona.
 * 3 — "Cómo trabaja" reducido de 9 a 4 ítems: se sacaron los que repetían lo
 *     que ya dicen las descripciones de competencia.
 * 4 — Intermedio del rediseño v2 (no publicado).
 * 5 — Especificación v2.0: motor relativo sin niveles ni Human Design, 7
 *     secciones y anexo para el reclutador. Los informes anteriores no se
 *     dibujan con este diseño: se ofrece regenerarlos.
 */
export const INFORME_VERSION = 5

/** Anexo del reclutador. Se guarda en `informe_anexo`, nunca en `contenido_json`. */
export type AnexoReclutador = InformeProseLLM['anexoReclutador']

/**
 * Forma final persistida en `informe_personalidad.contenido_json`. No lleva el
 * anexo: el postulante puede leer esta fila.
 */
export type InformePersonalidadJSON = Omit<InformeProseLLM, 'fortalezas' | 'anexoReclutador'> & {
  /** Nombre completo: encabezado del documento. */
  nombre: string
  /** 9 filas — del motor. */
  mapaPersonalidad: MapaPersonalidadItem[]
  /** Datos del Eneagrama — del motor. */
  eneagrama: {
    dominante: EneatipoRef
    ala: EneatipoRef
    secundario: EneatipoRef
    integracion: EneatipoRef
    estres: EneatipoRef
  }
  /** Las 4 fortalezas del motor, cada una con su texto del LLM. */
  fortalezas: { competencia: string; texto: string }[]
  /** Esquema con el que se generó. Ausente = 1. */
  version?: number
}

/**
 * Secciones del informe que el postulante valora con "¿Te reconocés?" (1-5).
 * La key es lo que se guarda en `feedback_informe_seccion.seccion_key`: no se
 * renombra, se agrega. El mapa no está porque lo dibuja el sistema, no el LLM.
 */
export const SECCIONES_FEEDBACK = [
  { key: 'sintesis', label: 'Síntesis del perfil' },
  { key: 'fortalezas', label: 'Fortalezas naturales' },
  { key: 'como_trabaja', label: 'Cómo trabaja' },
  { key: 'momento_presion', label: 'En su mejor momento y bajo presión' },
  { key: 'ecosistema', label: 'Ecosistema laboral' },
  { key: 'plan_desarrollo', label: 'Plan de desarrollo' },
] as const

export type SeccionFeedbackKey = (typeof SECCIONES_FEEDBACK)[number]['key']

/** Keys de secciones de informes anteriores: solo para leer el feedback histórico. */
export const SECCIONES_FEEDBACK_ANTERIORES: Record<string, string> = {
  descripcion: 'Descripción de personalidad (v4)',
  competencias: 'Competencias (v4)',
}

/**
 * `true` si el informe se generó con un esquema anterior al vigente. Esos
 * informes no se dibujan: su forma es otra y se ofrece regenerarlos.
 */
export function esFormatoAnterior(json: InformePersonalidadJSON | null | undefined): boolean {
  if (!json) return false
  return (json.version ?? 1) < INFORME_VERSION
}
