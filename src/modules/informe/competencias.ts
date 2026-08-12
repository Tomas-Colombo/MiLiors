/**
 * Motor de competencias — cálculo DETERMINÍSTICO, sin LLM.
 *
 * Entrada: los 9 scores del Eneagrama (porcentaje 0-100 por eneatipo, tal como
 * se guardan en `resultado_puntaje_eneagrama`) + Human Design opcional.
 * Salida: mapa de personalidad (9), 13 competencias con nivel + barras agrupadas
 * en 4 bloques, top-4 talentos y estilos dominante/secundario.
 *
 * La tabla de pesos y las reglas de refuerzo de HD son CONSTANTES EDITABLES
 * (la clienta las validará). No mover esta lógica al LLM.
 */

import type {
  BloqueCompetencia,
  CompetenciaItem,
  MapaPersonalidadItem,
  NivelCompetencia,
} from '@/lib/types/informe'

// ── Eneatipos ────────────────────────────────────────────────────────────────

export const ENEATIPO_NOMBRES: Record<number, string> = {
  1: 'El Reformador',
  2: 'El Ayudador',
  3: 'El Triunfador',
  4: 'El Individualista',
  5: 'El Investigador',
  6: 'El Leal',
  7: 'El Entusiasta',
  8: 'El Desafiador',
  9: 'El Pacificador',
}

// ── Tabla de pesos (eneatipo → competencia) ─────────────────────────────────
// Esquema 3/2/1: el primer tipo listado pesa 3, el segundo 2, el tercero 1.
// EDITABLE: la clienta puede ajustar tipos y pesos por competencia.

export type CompetenciaKey =
  | 'comercial'
  | 'comunicacion'
  | 'trabajo_equipo'
  | 'mediacion'
  | 'liderazgo'
  | 'autonomia'
  | 'innovacion'
  | 'storytelling'
  | 'analitico'
  | 'atencion_detalle'
  | 'organizacion'
  | 'adaptarse'
  | 'orientacion_resultados'

type CompetenciaDef = {
  key: CompetenciaKey
  nombre: string
  bloque: BloqueCompetencia
  /** eneatipo → peso. Suma de pesos = 6 (3+2+1) con el esquema por defecto. */
  pesos: Record<number, number>
}

/** Peso por posición en la lista de tipos de cada competencia. */
export const PESOS_POR_POSICION = [3, 2, 1] as const

function pesos(...tipos: number[]): Record<number, number> {
  const out: Record<number, number> = {}
  tipos.forEach((t, i) => {
    out[t] = PESOS_POR_POSICION[i] ?? 1
  })
  return out
}

export const COMPETENCIAS: CompetenciaDef[] = [
  // Cómo decide y lidera
  { key: 'liderazgo', nombre: 'Liderazgo', bloque: 'Cómo decide y lidera', pesos: pesos(8, 3, 2) },
  { key: 'autonomia', nombre: 'Autonomía e iniciativa', bloque: 'Cómo decide y lidera', pesos: pesos(8, 3, 7) },
  // Cómo se relaciona
  { key: 'comercial', nombre: 'Comercial / ventas relacionales', bloque: 'Cómo se relaciona', pesos: pesos(2, 7, 3) },
  { key: 'comunicacion', nombre: 'Comunicación', bloque: 'Cómo se relaciona', pesos: pesos(2, 7, 3) },
  { key: 'trabajo_equipo', nombre: 'Trabajo en equipo', bloque: 'Cómo se relaciona', pesos: pesos(2, 9, 6) },
  { key: 'mediacion', nombre: 'Mediación y resolución de conflictos', bloque: 'Cómo se relaciona', pesos: pesos(9, 2, 6) },
  // Cómo piensa y resuelve
  { key: 'analitico', nombre: 'Analítico / numérico', bloque: 'Cómo piensa y resuelve', pesos: pesos(5, 1, 6) },
  { key: 'atencion_detalle', nombre: 'Atención al detalle', bloque: 'Cómo piensa y resuelve', pesos: pesos(1, 5, 6) },
  { key: 'innovacion', nombre: 'Innovación y creatividad', bloque: 'Cómo piensa y resuelve', pesos: pesos(7, 4, 5) },
  { key: 'storytelling', nombre: 'Storytelling y expresión de marca', bloque: 'Cómo piensa y resuelve', pesos: pesos(4, 7, 2) },
  // Cómo ejecuta y se sostiene
  { key: 'organizacion', nombre: 'Organización y planificación', bloque: 'Cómo ejecuta y se sostiene', pesos: pesos(1, 3, 6) },
  { key: 'adaptarse', nombre: 'Adaptarse y afrontar', bloque: 'Cómo ejecuta y se sostiene', pesos: pesos(7, 9, 4) },
  { key: 'orientacion_resultados', nombre: 'Orientación a resultados', bloque: 'Cómo ejecuta y se sostiene', pesos: pesos(3, 8, 1) },
]

/**
 * `nombre` visible → `key` estable. El informe persistido en jsonb guarda las
 * competencias por nombre; el feedback las referencia por key para que renombrar
 * una competencia no invalide el histórico. Devuelve null si el nombre no existe
 * (informe de una versión anterior con otro set de competencias).
 */
export function competenciaKeyPorNombre(nombre: string): CompetenciaKey | null {
  const def = COMPETENCIAS.find(c => c.nombre === nombre)
  return def ? def.key : null
}

/** Orden de los bloques para el render. */
export const BLOQUES_ORDEN: BloqueCompetencia[] = [
  'Cómo decide y lidera',
  'Cómo se relaciona',
  'Cómo piensa y resuelve',
  'Cómo ejecuta y se sostiene',
]

/**
 * Desempate del top-4: ante scores iguales, gana la competencia que aparezca
 * antes en esta lista. EDITABLE.
 */
export const TALENTOS_PRIORIDAD: CompetenciaKey[] = [
  'liderazgo',
  'comercial',
  'comunicacion',
  'orientacion_resultados',
  'innovacion',
  'storytelling',
  'mediacion',
  'trabajo_equipo',
  'autonomia',
  'analitico',
  'organizacion',
  'adaptarse',
  'atencion_detalle',
]

// ── Refuerzo suave de Human Design ──────────────────────────────────────────
// Tope +15% sobre la competencia base, nunca invierte el Eneagrama. Si no hay
// HD, se omite sin romper el cálculo.

export const HD_REFUERZO_FACTOR = 0.15

export type HumanDesignInput = {
  tipo_energetico: string | null
  autoridad_hd: string | null
  perfil_hd: string | null
} | null

/** Devuelve el set de competencias reforzadas según los rasgos de HD. */
export function competenciasReforzadasPorHD(hd: HumanDesignInput): Set<CompetenciaKey> {
  const reforzadas = new Set<CompetenciaKey>()
  if (!hd) return reforzadas

  const tipo = (hd.tipo_energetico ?? '').toLowerCase()
  // Manifestor / Manifesting Generator → Autonomía e iniciativa.
  if (tipo.includes('manifest')) reforzadas.add('autonomia')
  // Proyector → Liderazgo y Mediación.
  if (tipo.includes('proyector')) {
    reforzadas.add('liderazgo')
    reforzadas.add('mediacion')
  }
  // Autoridad emocional → Mediación.
  if ((hd.autoridad_hd ?? '').toLowerCase().includes('emocional')) reforzadas.add('mediacion')
  // Perfil con línea 3 (ej "1/3", "3/5", "3/6") → Adaptarse y afrontar.
  if (perfilTieneLinea(hd.perfil_hd, 3)) reforzadas.add('adaptarse')

  return reforzadas
}

function perfilTieneLinea(perfil: string | null | undefined, linea: number): boolean {
  if (!perfil) return false
  return perfil.split('/').map(s => s.trim()).includes(String(linea))
}

// ── Contraste (recalibración de escala) ──────────────────────────────────────
// Los porcentajes del Eneagrama están centrados en 50: responder "3" en la escala
// Likert 1-5 rinde 50%. Además, cada competencia es un promedio ponderado de 3
// eneatipos, lo que comprime todavía más los valores hacia el centro (regresión a
// la media). Sin corrección, casi todas las competencias caen en "Medio" y casi
// ninguna alcanza "Medio-Alto"/"Alto" — el techo práctico queda en Medio.
//
// Para recuperar contraste estiramos la distribución alrededor del neutro 50:
//   score' = 50 + (score - 50) * FACTOR_CONTRASTE
// El neutro (50) queda fijo; lo que está por encima sube y lo que está por debajo
// baja, ensanchando la separación entre fortalezas y debilidades del perfil.
// EDITABLE: subir el factor rinde informes más marcados (más Altos/Bajos); bajarlo,
// informes más conservadores. La clienta lo valida contra datos reales.
export const FACTOR_CONTRASTE = 1.8

/** Estira un score 0-100 alrededor del neutro 50 (sin clampear). */
export function aplicarContraste(score: number): number {
  return 50 + (score - 50) * FACTOR_CONTRASTE
}

// ── Niveles + barras ────────────────────────────────────────────────────────

/** Mapea un score 0-100 a nivel + cantidad de barras (1-5). */
export function scoreANivel(score: number): { nivel: NivelCompetencia; barras: number } {
  if (score >= 80) return { nivel: 'Alto', barras: 5 }
  if (score >= 65) return { nivel: 'Medio-Alto', barras: 4 }
  if (score >= 45) return { nivel: 'Medio', barras: 3 }
  if (score >= 25) return { nivel: 'Medio-Bajo', barras: 2 }
  return { nivel: 'Bajo', barras: 1 }
}

/** Representación textual de las barras, ej barras=4 → "■■■■_". */
export function barrasAString(barras: number): string {
  const llenas = Math.max(0, Math.min(5, barras))
  return '■'.repeat(llenas) + '_'.repeat(5 - llenas)
}

// ── Textos de marco ──────────────────────────────────────────────────────────

export const TALENTOS_ACLARACION =
  'Estos talentos salen de tus 4 competencias con mejor correlación; no es una lista cerrada.'

/** Títulos exactos del bloque "Cómo trabajás" (9 ítems). */
export const COMO_TRABAJAS_TITULOS = [
  'Tu estilo de liderazgo',
  'Tu estilo de decisión',
  'Tu estilo comercial',
  'En equipo',
  'Tu estilo de comunicación',
  'Ambiente donde rendís mejor',
  'Para seguir creciendo',
  'Tip para tus entrevistas',
  'Qué trabajos son los que más se va a destacar',
] as const

// ── Motor ────────────────────────────────────────────────────────────────────

export type CompetenciaCalculada = {
  key: CompetenciaKey
  nombre: string
  bloque: BloqueCompetencia
  score: number
  nivel: NivelCompetencia
  barras: number
}

export type EstiloEneatipo = { numero: number; nombre: string; score: number }

export type MotorResultado = {
  mapaPersonalidad: MapaPersonalidadItem[]
  competencias: CompetenciaCalculada[]
  talentosTop: CompetenciaCalculada[]
  estiloDominante: EstiloEneatipo
  estiloSecundario: EstiloEneatipo
}

/**
 * Calcula el informe determinístico.
 * @param scores  Record eneatipo(1-9) → porcentaje 0-100.
 * @param hd      Human Design opcional (refuerzo suave).
 */
export function calcularMotor(scores: Record<number, number>, hd: HumanDesignInput = null): MotorResultado {
  const puntaje = (t: number) => Math.max(0, Math.min(100, scores[t] ?? 0))
  const reforzadas = competenciasReforzadasPorHD(hd)

  const competencias: CompetenciaCalculada[] = COMPETENCIAS.map(def => {
    const sumaPesos = Object.values(def.pesos).reduce((a, b) => a + b, 0) || 1
    const raw = Object.entries(def.pesos).reduce(
      (acc, [tipo, peso]) => acc + peso * puntaje(Number(tipo)),
      0,
    )
    // Normalizar 0-100 (raw máximo = sumaPesos * 100).
    let score = raw / sumaPesos
    // Recalibración de contraste (ver FACTOR_CONTRASTE): estira la distribución
    // alrededor del neutro 50 para que las competencias no se aplasten en "Medio".
    score = aplicarContraste(score)
    // Refuerzo suave de HD (tope +15%, clamp a 100 → nunca invierte de forma brusca).
    if (reforzadas.has(def.key)) score = score * (1 + HD_REFUERZO_FACTOR)
    score = Math.round(Math.max(0, Math.min(100, score)))
    const { nivel, barras } = scoreANivel(score)
    return { key: def.key, nombre: def.nombre, bloque: def.bloque, score, nivel, barras }
  })

  // Top-4: score desc, desempate por TALENTOS_PRIORIDAD.
  const prioridad = (k: CompetenciaKey) => {
    const idx = TALENTOS_PRIORIDAD.indexOf(k)
    return idx === -1 ? Number.MAX_SAFE_INTEGER : idx
  }
  const talentosTop = [...competencias]
    .sort((a, b) => b.score - a.score || prioridad(a.key) - prioridad(b.key))
    .slice(0, 4)

  // Mapa de personalidad (9 eneatipos con su score).
  const mapaPersonalidad: MapaPersonalidadItem[] = Array.from({ length: 9 }, (_, i) => {
    const numero = i + 1
    return { eneatipo: numero, nombre: ENEATIPO_NOMBRES[numero], score: Math.round(puntaje(numero)) }
  })

  // Estilos dominante + secundario (mayor y segundo mayor score de eneatipo).
  const ranking = [...mapaPersonalidad].sort((a, b) => b.score - a.score || a.eneatipo - b.eneatipo)
  const estiloDominante: EstiloEneatipo = {
    numero: ranking[0].eneatipo,
    nombre: ranking[0].nombre,
    score: ranking[0].score,
  }
  const estiloSecundario: EstiloEneatipo = {
    numero: ranking[1].eneatipo,
    nombre: ranking[1].nombre,
    score: ranking[1].score,
  }

  return { mapaPersonalidad, competencias, talentosTop, estiloDominante, estiloSecundario }
}

/** Reordena las competencias calculadas por bloque (orden de render). */
export function agruparPorBloque(
  competencias: CompetenciaItem[],
): { bloque: BloqueCompetencia; items: CompetenciaItem[] }[] {
  return BLOQUES_ORDEN.map(bloque => ({
    bloque,
    items: competencias.filter(c => c.bloque === bloque),
  }))
}
