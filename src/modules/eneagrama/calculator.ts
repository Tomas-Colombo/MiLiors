export type NumeroEneatipo = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export type RespuestaInput = {
  preguntaId: string
  eneatipoAsociado: NumeroEneatipo
  valorRespondido: 1 | 2 | 3 | 4 | 5
}

export type PuntajeTipo = {
  eneatipo: NumeroEneatipo
  puntajeCrudo: number
  porcentaje: number
}

export type ResultadoCalculo = {
  /** Los 9 puntajes en orden de eneatipo 1–9 */
  puntajes: PuntajeTipo[]
  /** Los 9 puntajes ordenados de mayor a menor */
  ranking: PuntajeTipo[]
  /** Uno o más eneatipos si hay empate de puntaje máximo */
  dominantes: NumeroEneatipo[]
  tieneEmpateDominante: boolean
  /**
   * Ala del dominante (vecino circular con mayor puntaje).
   * null cuando hay empate de dominante: no se puede determinar ala
   * sin información adicional del candidato.
   */
  ala: NumeroEneatipo | null
  /** true cuando los dos vecinos del dominante tienen el mismo puntaje */
  tieneEmpateAla: boolean
  /** "9w1", "1/6 (empate)", etc. null solo si hay empate de dominante */
  notacion: string | null
}

export class ErrorRespuestasIncompletas extends Error {
  constructor(public readonly faltantes: string[]) {
    super(
      `Test incompleto. Faltan ${faltantes.length} respuesta(s): ${faltantes.join(', ')}`
    )
    this.name = 'ErrorRespuestasIncompletas'
  }
}

const TODOS_LOS_TIPOS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

function vecinosCirculares(tipo: NumeroEneatipo): [NumeroEneatipo, NumeroEneatipo] {
  const anterior = (tipo === 1 ? 9 : tipo - 1) as NumeroEneatipo
  const siguiente = (tipo === 9 ? 1 : tipo + 1) as NumeroEneatipo
  return [anterior, siguiente]
}

/**
 * Calcula el resultado del test de Eneagrama ITA Riso-Hudson.
 *
 * @param respuestas  Respuestas del candidato con eneatipo resuelto.
 * @param preguntasEsperadasIds  Si se pasa, valida que todas estén respondidas.
 *   En producción (135 preguntas activas) se obtiene consultando pregunta_eneagrama
 *   donde pausada = false. En desarrollo puede ser un subconjunto.
 */
export function calcularResultadoEneagrama(
  respuestas: RespuestaInput[],
  preguntasEsperadasIds?: Set<string>
): ResultadoCalculo {
  // 1. Validar completitud si se pasaron los IDs esperados
  if (preguntasEsperadasIds && preguntasEsperadasIds.size > 0) {
    const respondidas = new Set(respuestas.map(r => r.preguntaId))
    const faltantes = [...preguntasEsperadasIds].filter(id => !respondidas.has(id))
    if (faltantes.length > 0) {
      throw new ErrorRespuestasIncompletas(faltantes)
    }
  }

  // 2. Sumar por eneatipo y contar preguntas respondidas por tipo
  const sumas: Record<number, number> = {}
  const conteo: Record<number, number> = {}
  for (const t of TODOS_LOS_TIPOS) {
    sumas[t] = 0
    conteo[t] = 0
  }

  for (const r of respuestas) {
    const t = r.eneatipoAsociado
    sumas[t] += r.valorRespondido
    conteo[t]++
  }

  // 3. Puntajes y porcentajes
  // Porcentaje calculado dinámicamente según preguntas respondidas por tipo
  // (en producción siempre 15, en dev puede ser menor).
  // Fórmula: ((crudo - min) / (max - min)) * 100
  const puntajes: PuntajeTipo[] = TODOS_LOS_TIPOS.map(eneatipo => {
    const n = conteo[eneatipo]
    const puntajeCrudo = sumas[eneatipo]
    const minPosible = n * 1
    const maxPosible = n * 5
    const rango = maxPosible - minPosible
    const porcentaje =
      rango > 0
        ? Math.round(((puntajeCrudo - minPosible) / rango) * 1000) / 10
        : 0
    return { eneatipo, puntajeCrudo, porcentaje }
  })

  // 4. Ranking descendente (desempate por número de eneatipo, menor primero)
  const ranking = [...puntajes].sort((a, b) =>
    b.puntajeCrudo !== a.puntajeCrudo
      ? b.puntajeCrudo - a.puntajeCrudo
      : a.eneatipo - b.eneatipo
  )

  // 5. Dominante(s)
  const maxPuntaje = ranking[0].puntajeCrudo
  const dominantes = ranking
    .filter(p => p.puntajeCrudo === maxPuntaje)
    .map(p => p.eneatipo)

  const tieneEmpateDominante = dominantes.length > 1

  // 6. Ala
  // Con empate de dominante no se calcula ala: el test necesita resolución
  // humana (o una segunda pasada del candidato) para determinarlo.
  let ala: NumeroEneatipo | null = null
  let tieneEmpateAla = false

  if (!tieneEmpateDominante) {
    const dominante = dominantes[0]
    const [vecA, vecB] = vecinosCirculares(dominante)
    const pA = sumas[vecA]
    const pB = sumas[vecB]

    if (pA > pB) {
      ala = vecA
    } else if (pB > pA) {
      ala = vecB
    } else {
      // Empate de ala: se reporta el vecino de número menor como referencia
      // y se marca el flag para que la UI pueda indicarlo.
      tieneEmpateAla = true
      ala = (vecA < vecB ? vecA : vecB) as NumeroEneatipo
    }
  }

  // 7. Notación
  let notacion: string | null = null
  if (tieneEmpateDominante) {
    notacion = dominantes.join('/') + ' (empate)'
  } else if (ala !== null) {
    notacion = `${dominantes[0]}w${ala}`
  }

  return {
    puntajes,
    ranking,
    dominantes,
    tieneEmpateDominante,
    ala,
    tieneEmpateAla,
    notacion,
  }
}
