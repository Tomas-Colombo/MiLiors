import type { InformePersonalidadJSON } from '@/lib/types/informe'
import { calcularMotor, COMO_TRABAJAS_TITULOS, type HumanDesignInput } from './competencias'

/**
 * Datos mock para probar el informe end-to-end SIN llamar al LLM.
 * Los NÚMEROS salen del motor real; la PROSA es placeholder determinístico.
 *
 * Uso: `buildMockInforme()` devuelve un InformePersonalidadJSON completo, listo
 * para pintar en el visor / PDF o para sembrar en `informe_personalidad.contenido_json`.
 */

/** Perfil de ejemplo: comercial-relacional con impulso creativo (tipos 2/7/4/3 altos). */
export const MOCK_SCORES: Record<number, number> = {
  1: 35, 2: 92, 3: 70, 4: 78, 5: 30, 6: 40, 7: 85, 8: 45, 9: 60,
}

export const MOCK_HD: HumanDesignInput = {
  tipo_energetico: 'Generador Manifestante',
  autoridad_hd: 'Emocional',
  perfil_hd: '3/5',
}

export function buildMockInforme(
  nombre = 'Jesica Gómez',
  scores: Record<number, number> = MOCK_SCORES,
  hd: HumanDesignInput = MOCK_HD,
): InformePersonalidadJSON {
  const motor = calcularMotor(scores, hd)

  return {
    nombre,
    subtitulo: 'Perfil comercial y relacional con impulso creativo',
    descripcionPersonalidad:
      `${nombre.split(' ')[0]} combina inteligencia emocional y vocación de servicio con una energía optimista y creativa. ` +
      'Conecta con facilidad, comunica con calidez y detecta oportunidades donde otros ven obstáculos. ' +
      'Su estilo de liderazgo es inspirador: motiva desde el ejemplo y traduce necesidades en propuestas concretas.',
    mapaPersonalidad: motor.mapaPersonalidad,
    competencias: motor.competencias.map(c => ({
      bloque: c.bloque,
      nombre: c.nombre,
      nivel: c.nivel,
      barras: c.barras,
      descripcion: `Muestra un desempeño de nivel ${c.nivel.toLowerCase()} en ${c.nombre.toLowerCase()}.`,
    })),
    talentosTop: motor.talentosTop.map(t => ({
      nombre: t.nombre,
      descripcion:
        `${t.nombre} es una de sus fortalezas más marcadas. La ejerce con naturalidad y la sostiene en el tiempo, ` +
        'aportando valor concreto al equipo y a los resultados.',
    })),
    comoTrabajas: COMO_TRABAJAS_TITULOS.map(titulo => ({
      titulo,
      texto: `Descripción de ejemplo para "${titulo.toLowerCase()}", combinando su estilo dominante y secundario.`,
    })),
  }
}

/** Informe mock completo (perfil de ejemplo). */
export const MOCK_INFORME_JSON: InformePersonalidadJSON = buildMockInforme()
