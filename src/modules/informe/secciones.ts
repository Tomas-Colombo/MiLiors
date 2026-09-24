import {
  EJES_COMO_TRABAJA,
  type AnexoReclutador,
  type InformePersonalidadJSON,
  type SeccionFeedbackKey,
} from '@/lib/types/informe'

/**
 * Estructura del informe (especificación v2.0), independiente del render.
 *
 * Pantalla, PDF y vista del reclutador dibujan lo mismo con estilos distintos:
 * este módulo decide QUÉ va en cada sección y en qué orden, y cada vista solo
 * decide CÓMO se ve. Así una sección nueva se agrega en un solo lugar.
 *
 * El mapa de personalidad no está: lo dibuja cada vista después de la síntesis.
 */

export type BloqueInforme =
  | { tipo: 'parrafo'; texto: string }
  /** Ítem con título; `nota` es una línea secundaria (ej "Dónde crecer"). */
  | { tipo: 'item'; titulo: string; texto: string; nota?: string }
  | { tipo: 'lista'; titulo: string; items: string[] }

export type SeccionInforme = {
  key: SeccionFeedbackKey
  titulo: string
  bloques: BloqueInforme[]
}

const parrafo = (texto: string): BloqueInforme => ({ tipo: 'parrafo', texto })
const item = (titulo: string, texto: string, nota?: string): BloqueInforme => ({ tipo: 'item', titulo, texto, nota })
const lista = (titulo: string, items: string[]): BloqueInforme => ({ tipo: 'lista', titulo, items })

export function seccionesInforme(json: InformePersonalidadJSON): SeccionInforme[] {
  const { comoTrabaja, ecosistema, planDesarrollo } = json
  return [
    { key: 'sintesis', titulo: 'Síntesis del perfil', bloques: [parrafo(json.sintesis)] },
    {
      key: 'fortalezas',
      titulo: 'Fortalezas naturales',
      bloques: json.fortalezas.map(f => item(f.competencia, f.texto)),
    },
    {
      key: 'como_trabaja',
      titulo: 'Cómo trabaja',
      bloques: EJES_COMO_TRABAJA.map(eje =>
        item(eje.titulo, comoTrabaja[eje.key].estilo, `Dónde crecer: ${comoTrabaja[eje.key].dondeCrecer}`),
      ),
    },
    {
      key: 'momento_presion',
      titulo: 'En su mejor momento y bajo presión',
      bloques: [item('En su mejor momento', json.mejorMomento), item('Bajo presión', json.bajoPresion)],
    },
    {
      key: 'ecosistema',
      titulo: 'Ecosistema laboral',
      bloques: [
        lista('Tareas donde más aporta', ecosistema.tareas),
        lista('Puestos afines', ecosistema.puestos),
        lista('Zona de fricción', ecosistema.zonaFriccion),
      ],
    },
    {
      key: 'plan_desarrollo',
      titulo: 'Plan de desarrollo',
      bloques: [
        ...planDesarrollo.focos.map(f => item(f.competencia, f.accion)),
        lista('Preguntas para reflexionar', planDesarrollo.preguntasReflexion),
      ],
    },
  ]
}

/** Anexo del reclutador. NUNCA se muestra al postulante. */
export function bloquesAnexo(a: AnexoReclutador): BloqueInforme[] {
  return [
    lista('Preguntas STAR para la entrevista', a.preguntasSTAR),
    item('Cómo asignarle tareas', a.comoAsignarle),
    item('Qué evitar', a.queEvitar),
    item('Señal de alerta temprana', a.senalAlerta),
  ]
}
