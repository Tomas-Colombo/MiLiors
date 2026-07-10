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

export const UNIVERSIDADES_ARGENTINA = [
  'Universidad de Buenos Aires (UBA)',
  'Universidad Nacional de Córdoba (UNC)',
  'Universidad Nacional de La Plata (UNLP)',
  'Universidad Nacional de Rosario (UNR)',
  'Universidad Nacional de Mar del Plata (UNMDP)',
  'Universidad Nacional de Tucumán (UNT)',
  'Universidad Nacional del Litoral (UNL)',
  'Universidad Nacional de Cuyo (UNCUYO)',
  'Universidad Nacional del Sur (UNS)',
  'Universidad Nacional de Salta (UNSA)',
  'Universidad Nacional de Misiones (UNAM)',
  'Universidad Nacional de Entre Ríos (UNER)',
  'Universidad Nacional de San Juan (UNSJ)',
  'Universidad Nacional de La Rioja (UNLAR)',
  'Universidad Nacional de Santiago del Estero (UNSE)',
  'Universidad Nacional de Jujuy (UNJU)',
  'Universidad Nacional de Formosa (UNAF)',
  'Universidad Nacional de Catamarca (UNCA)',
  'Universidad Nacional del Comahue (UNCOMA)',
  'Universidad Nacional de Río Cuarto (UNRC)',
  'Universidad Nacional de Luján (UNLU)',
  'Universidad Nacional de Lomas de Zamora (UNLZ)',
  'Universidad Nacional de La Matanza (UNLAM)',
  'Universidad Nacional de Quilmes (UNQ)',
  'Universidad Nacional de General Sarmiento (UNGS)',
  'Universidad Nacional de Lanús (UNLA)',
  'Universidad Nacional de Tres de Febrero (UNTREF)',
  'Universidad Nacional Arturo Jauretche (UNAJ)',
  'Universidad Nacional de Avellaneda (UNDAV)',
  'Universidad Nacional del Oeste (UNO)',
  'Universidad Nacional de José C. Paz (UNPAZ)',
  'Universidad Nacional de Moreno (UNM)',
  'Universidad Nacional de Villa Mercedes (UNVM)',
  'Universidad Nacional de Chilecito (UNDEC)',
  'Universidad Nacional de Tierra del Fuego (UNTDF)',
  'Universidad Nacional Patagónica San Juan Bosco (UNPSB)',
  'Universidad Nacional de la Patagonia Austral (UNPA)',
  'Universidad Tecnológica Nacional (UTN)',
  'Universidad Nacional de San Martín (UNSAM)',
  'Universidad Nacional de San Luis (UNSL)',
  'Universidad Católica Argentina (UCA)',
  'Universidad Austral',
  'Universidad Di Tella (UTDT)',
  'Universidad de Palermo (UP)',
  'Universidad Torcuato Di Tella',
  'Universidad Blas Pascal (UBP)',
  'Universidad Siglo 21',
  'Universidad Abierta Interamericana (UAI)',
  'Universidad de Belgrano (UB)',
  'Universidad del Salvador (USAL)',
  'Universidad Católica de Córdoba (UCC)',
  'Universidad Católica de La Plata (UCALP)',
  'Universidad Católica de Cuyo (UCCUYO)',
  'Universidad Católica de Salta (UCASAL)',
  'Universidad Adventista del Plata (UAP)',
  'Universidad Maimónides',
  'Universidad de Ciencias Empresariales y Sociales (UCES)',
  'Universidad Favaloro',
  'Universidad ORT Argentina',
  'Universidad de Flores (UFLO)',
  'Universidad CAECE',
  'Universidad Kennedy',
  'Universidad de Morón (UM)',
  'Universidad del Aconcagua (UDA)',
  'Universidad Champagnat',
  'Universidad Empresarial Siglo 21',
  'Instituto Tecnológico Buenos Aires (ITBA)',
  'Instituto Universitario Aeronáutico (IUA)',
  'Instituto Universitario CEMA (UCEMA)',
  'Otra',
] as const

export const IDIOMAS_COMUNES = [
  'Español',
  'Inglés',
  'Portugués',
  'Francés',
  'Alemán',
  'Italiano',
  'Chino Mandarín',
  'Japonés',
  'Árabe',
  'Ruso',
  'Coreano',
  'Hindi',
  'Turco',
  'Neerlandés',
  'Polaco',
  'Sueco',
  'Otro',
] as const

export const TIPO_PREGUNTA_PRESELECTOR = {
  OPCIONES: 'OPCIONES',
  TEXTO_LIBRE: 'TEXTO_LIBRE',
} as const

export const TIPO_PREGUNTA_PRESELECTOR_LABEL: Record<string, string> = {
  OPCIONES: 'Opciones',
  TEXTO_LIBRE: 'Texto libre',
}

// Rutas por rol (para uso en proxy y redirecciones)
export const RUTAS_POR_ROL: Record<string, string> = {
  ADMIN: '/admin',
  POSTULANTE: '/postulante',
  RECLUTADOR: '/reclutador',
}
