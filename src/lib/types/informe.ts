export type InformeJSON = {
  perfil_personalidad: string
  fortalezas_laborales: string
  areas_desarrollo: string
  compatibilidad_entorno: string
  recomendaciones_reclutadores: string
}

export const INFORME_SECTION_LABELS: Record<keyof InformeJSON, string> = {
  perfil_personalidad: 'Perfil de personalidad',
  fortalezas_laborales: 'Fortalezas en entorno laboral',
  areas_desarrollo: 'Áreas de desarrollo',
  compatibilidad_entorno: 'Compatibilidad con entornos de trabajo',
  recomendaciones_reclutadores: 'Recomendaciones para reclutadores',
}

export const INFORME_SECTION_ORDER: (keyof InformeJSON)[] = [
  'perfil_personalidad',
  'fortalezas_laborales',
  'areas_desarrollo',
  'compatibilidad_entorno',
  'recomendaciones_reclutadores',
]
