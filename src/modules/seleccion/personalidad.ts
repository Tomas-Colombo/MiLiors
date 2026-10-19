/**
 * Bloque "INFORME DE PERSONALIDAD" de cada candidato en el informe de selección.
 *
 * Todos los candidatos se comparan con el MISMO criterio: los datos del motor
 * (orden de competencias, fortalezas, focos, eneatipo y ala) se calculan acá con
 * `calcularMotorV2` a partir de los 9 porcentajes guardados, sin LLM y sin leer
 * el informe persistido. Así un informe de formato anterior (v1-v4, generado con
 * otro motor) no mete competencias que contradigan el ranking vigente.
 *
 * La prosa del informe suma contexto solo cuando está en el formato vigente. Si
 * es anterior, se manda una narrativa resumida de mejor esfuerzo, sin niveles ni
 * competencias del motor viejo.
 */

import { calcularMotorV2, type MotorV2Resultado } from '@/modules/informe/competencias'
import {
  EJES_COMO_TRABAJA,
  esFormatoAnterior,
  type InformePersonalidadJSON,
} from '@/lib/types/informe'
import { recortarEnOracion } from '@/lib/recorte-texto'

/** Límites por sección: generosos, para que un informe vigente entre entero. */
export const LIMITES_PERSONALIDAD = {
  sintesis: 1200,
  fortaleza: 500,
  estilo: 400,
  foco: 400,
  subtituloAnterior: 200,
  descripcionAnterior: 1200,
} as const

export const ETIQUETA_FORMATO_ANTERIOR = 'informe en formato anterior: narrativa resumida'

/**
 * El candidato rehizo el Eneagrama: los scores se pisan en el lugar, así que la
 * prosa del informe describe un resultado viejo y contradiría al motor.
 */
export const ETIQUETA_DESACTUALIZADO =
  'el candidato rehizo el Eneagrama; la narrativa del informe no está actualizada'

type Scores = Record<number, number>

/** Texto no vacío o null: el JSON viene de la base y puede estar incompleto. */
function texto(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  const t = valor.trim()
  return t.length > 0 ? t : null
}

function registro(valor: unknown): Record<string, unknown> | null {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : null
}

function lista(valor: unknown): Record<string, unknown>[] {
  if (!Array.isArray(valor)) return []
  return valor.map(registro).filter((r): r is Record<string, unknown> => r !== null)
}

function bloqueMotor(motor: MotorV2Resultado): string {
  const nombres = (items: { nombre: string }[]) => items.map((c) => c.nombre).join('; ')
  const orden = motor.ordenCompleto.map((c, i) => `${i + 1}. ${c.nombre}`).join('; ')

  return [
    'Datos del motor de competencias (mismo criterio para todos los candidatos):',
    `- Eneatipo dominante: ${motor.dominante.numero} — ${motor.dominante.nombre} (ala ${motor.ala.numero} — ${motor.ala.nombre})`,
    `- Competencias de mayor a menor afinidad natural: ${orden}`,
    `- Fortalezas (las ${motor.fortalezas.length} primeras): ${nombres(motor.fortalezas)}`,
    `- Focos de desarrollo (las ${motor.focosDesarrollo.length} últimas): ${nombres(motor.focosDesarrollo)}`,
  ].join('\n')
}

/** Prosa del informe vigente (v5) que importa para seleccionar. Null si no hay nada utilizable. */
function bloqueProsaVigente(json: Record<string, unknown>): string | null {
  const partes: string[] = []

  const sintesis = texto(json.sintesis)
  if (sintesis) partes.push(`Síntesis: ${recortarEnOracion(sintesis, LIMITES_PERSONALIDAD.sintesis)}`)

  const fortalezas = lista(json.fortalezas).flatMap((f) => {
    const competencia = texto(f.competencia)
    const detalle = texto(f.texto)
    return competencia && detalle
      ? [`- ${competencia}: ${recortarEnOracion(detalle, LIMITES_PERSONALIDAD.fortaleza)}`]
      : []
  })
  if (fortalezas.length > 0) partes.push(`Fortalezas:\n${fortalezas.join('\n')}`)

  const comoTrabaja = registro(json.comoTrabaja)
  const estilos = EJES_COMO_TRABAJA.flatMap((eje) => {
    const estilo = texto(registro(comoTrabaja?.[eje.key])?.estilo)
    return estilo ? [`- ${eje.titulo}: ${recortarEnOracion(estilo, LIMITES_PERSONALIDAD.estilo)}`] : []
  })
  if (estilos.length > 0) partes.push(`Cómo trabaja:\n${estilos.join('\n')}`)

  const focos = lista(registro(json.planDesarrollo)?.focos).flatMap((f) => {
    const competencia = texto(f.competencia)
    const accion = texto(f.accion)
    return competencia && accion
      ? [`- ${competencia}: ${recortarEnOracion(accion, LIMITES_PERSONALIDAD.foco)}`]
      : []
  })
  if (focos.length > 0) partes.push(`Focos de desarrollo (acción sugerida):\n${focos.join('\n')}`)

  return partes.length > 0 ? partes.join('\n\n') : null
}

/**
 * Narrativa de un informe de formato anterior, de mejor esfuerzo: solo el
 * subtítulo y la descripción. Nunca sus competencias ni niveles.
 */
function bloqueNarrativaAnterior(json: Record<string, unknown>): string | null {
  const subtitulo = texto(json.subtitulo)
  const descripcion = texto(json.descripcionPersonalidad)
  if (!subtitulo && !descripcion) return null

  const lineas = [`Narrativa (${ETIQUETA_FORMATO_ANTERIOR}):`]
  if (subtitulo) lineas.push(`Subtítulo: ${recortarEnOracion(subtitulo, LIMITES_PERSONALIDAD.subtituloAnterior)}`)
  if (descripcion) {
    lineas.push(`Descripción: ${recortarEnOracion(descripcion, LIMITES_PERSONALIDAD.descripcionAnterior)}`)
  }
  return lineas.join('\n')
}

/**
 * Arma el bloque de personalidad de un candidato.
 *
 * @param scores   Porcentaje 0-100 por eneatipo (1-9) o null si nunca terminó el
 *                 Eneagrama. Sin scores no hay motor y se devuelve null: el
 *                 prompt muestra "No disponible" y el modelo lo señala.
 * @param informe  `contenido_json` del informe LISTO, o null si no hay.
 * @param opciones `desactualizado`: el informe es anterior a un nuevo Eneagrama;
 *                 se manda solo el motor (scores vigentes) y una aclaración.
 */
export function construirBloquePersonalidad(
  scores: Scores | null,
  informe: InformePersonalidadJSON | null,
  opciones: { desactualizado?: boolean } = {},
): string | null {
  if (!scores || Object.keys(scores).length === 0) return null

  const partes = [bloqueMotor(calcularMotorV2(scores))]

  const json = registro(informe)
  if (json && opciones.desactualizado) {
    partes.push(`Narrativa del informe omitida (${ETIQUETA_DESACTUALIZADO}).`)
  } else if (json) {
    const narrativa = esFormatoAnterior(informe)
      ? bloqueNarrativaAnterior(json)
      : bloqueProsaVigente(json)
    if (narrativa) partes.push(narrativa)
  }

  return partes.join('\n\n')
}
