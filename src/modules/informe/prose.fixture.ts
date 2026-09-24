import { EJES_COMO_TRABAJA, type InformeProseLLM } from '@/lib/types/informe'
import type { MotorV2Resultado } from './competencias'

/**
 * Prosa completa y fiel al motor, en el formato de salida de la especificación
 * v2.0. Solo para tests: cada uno rompe la parte que le interesa.
 */
export function proseValida(motor: MotorV2Resultado, overrides: Partial<InformeProseLLM> = {}): InformeProseLLM {
  return {
    subtitulo: 'Perfil relacional y comercial',
    sintesis: 'Síntesis del perfil.',
    fortalezas: motor.fortalezas.map(c => ({ competencia: c.nombre, texto: `Cómo se ve ${c.nombre}.` })),
    comoTrabaja: Object.fromEntries(
      EJES_COMO_TRABAJA.map(e => [e.key, { estilo: `Estilo de ${e.titulo}.`, dondeCrecer: `Crecer en ${e.titulo}.` }]),
    ) as InformeProseLLM['comoTrabaja'],
    mejorMomento: 'En su mejor momento.',
    bajoPresion: 'Bajo presión.',
    ecosistema: { tareas: ['T1', 'T2', 'T3'], puestos: ['P1', 'P2', 'P3'], zonaFriccion: ['Z1', 'Z2'] },
    planDesarrollo: {
      focos: motor.focosDesarrollo.map(c => ({ competencia: c.nombre, accion: `Practicar ${c.nombre}.` })),
      preguntasReflexion: ['¿Q1?', '¿Q2?', '¿Q3?'],
    },
    anexoReclutador: {
      preguntasSTAR: ['S1', 'S2', 'S3'],
      comoAsignarle: 'Asignarle así.',
      queEvitar: 'Evitar esto.',
      senalAlerta: 'Alerta temprana.',
    },
    ...overrides,
  }
}
