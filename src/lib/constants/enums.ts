export const ROL_USUARIO = {
  ADMIN: 'ADMIN',
  POSTULANTE: 'POSTULANTE',
  RECLUTADOR: 'RECLUTADOR',
} as const

export const ESTADO_INFORME = {
  PENDIENTE: 'PENDIENTE',
  LISTO: 'LISTO',
  ERROR: 'ERROR',
} as const

export const ESTADO_POSTULACION = {
  ENVIADA: 'ENVIADA',
  VISTO: 'VISTO',
  PROCESO_FINALIZADO: 'PROCESO_FINALIZADO',
  CERRADA: 'CERRADA',
} as const

export const ESTADO_POSTULACION_LABEL: Record<string, string> = {
  ENVIADA: 'Tu aplicación ha sido recibida',
  VISTO: 'Tu perfil ha sido visualizado',
  PROCESO_FINALIZADO: 'Tu aplicación ha sido descartada',
  CERRADA: 'La vacante ha sido concluida',
}

export const CARGA_HORARIA = {
  TIEMPO_COMPLETO: 'TIEMPO_COMPLETO',
  MEDIO_TIEMPO: 'MEDIO_TIEMPO',
  POR_HORAS_FREELANCE: 'POR_HORAS_FREELANCE',
} as const

export const CARGA_HORARIA_LABEL: Record<string, string> = {
  TIEMPO_COMPLETO: 'Tiempo completo',
  MEDIO_TIEMPO: 'Medio tiempo',
  POR_HORAS_FREELANCE: 'Por horas / Freelance',
}

export const UBICACION = {
  REMOTO: 'REMOTO',
  HIBRIDO: 'HIBRIDO',
  LOCALIDADES: 'LOCALIDADES',
} as const

export const UBICACION_LABEL: Record<string, string> = {
  REMOTO: 'Remoto',
  HIBRIDO: 'Híbrido',
  LOCALIDADES: 'Presencial',
}

export const NIVEL_IDIOMA = {
  BASICO: 'BASICO',
  INTERMEDIO: 'INTERMEDIO',
  AVANZADO: 'AVANZADO',
  NATIVO: 'NATIVO',
} as const

export const NIVEL_IDIOMA_LABEL: Record<string, string> = {
  BASICO: 'Básico',
  INTERMEDIO: 'Intermedio',
  AVANZADO: 'Avanzado',
  NATIVO: 'Nativo',
}

export const TIPO_ENERGETICO_HD = [
  'Generador',
  'Generador Manifestante',
  'Proyector',
  'Manifestador',
  'Reflector',
] as const

export const ENERGY_TYPE_CLASSIFICATION_HD = [
  'Energético',
  'No Energético',
] as const

export const PERFIL_HD = [
  '1/3', '1/4', '2/4', '2/5', '3/5', '3/6',
  '4/6', '4/1', '5/1', '5/2', '6/2', '6/3',
] as const

export const AUTORIDAD_HD = [
  'Emocional',
  'Sacral',
  'Esplénico',
  'Ego/Corazón',
  'Auto-Proyectada',
  'Mental/Ambiental',
  'Lunar',
] as const

export const ESTRATEGIA_HD = [
  'Responder',
  'Informar',
  'Esperar la Invitación',
  'Esperar un Ciclo Lunar',
] as const

// Rutas por rol (para uso en proxy y redirecciones)
export const RUTAS_POR_ROL: Record<string, string> = {
  ADMIN: '/admin',
  POSTULANTE: '/postulante',
  RECLUTADOR: '/reclutador',
}
