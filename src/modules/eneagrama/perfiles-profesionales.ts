/**
 * Traducción del resultado de Eneagrama a lenguaje laboral.
 *
 * El eneatipo es la fuente (número + nombre técnico), pero el postulante ve un
 * perfil profesional descriptivo: qué aporta, dónde rinde mejor y qué desarrollar.
 * Sin jerga del sistema ni lenguaje simbólico.
 *
 * `fortaleza` / `entorno` / `desarrollo` son la versión de una línea (dashboard);
 * `fortalezas` / `desarrollos` son el detalle en viñetas (perfil de personalidad).
 *
 * EDITABLE: textos validables por la clienta.
 */

export type PerfilProfesional = {
  /** Título visible del perfil. */
  titulo: string
  /** Descripción breve, 1-2 oraciones. */
  resumen: string
  fortaleza: string
  entorno: string
  desarrollo: string
  fortalezas: string[]
  desarrollos: string[]
}

export const PERFILES_PROFESIONALES: Record<number, PerfilProfesional> = {
  1: {
    titulo: 'Perfil estructurado y orientado a la calidad',
    resumen:
      'Trabajás con estándares altos y criterio propio sobre cómo deben hacerse las cosas. Aportás orden, precisión y consistencia en la ejecución.',
    fortaleza: 'Rigor, atención al detalle y cumplimiento de estándares.',
    entorno: 'Procesos definidos, criterios de calidad claros y objetivos concretos.',
    desarrollo: 'Delegar y aceptar resultados suficientemente buenos cuando el plazo lo exige.',
    fortalezas: [
      'Atención al detalle y trabajo sin errores.',
      'Orden y método para sostener procesos en el tiempo.',
      'Criterio ético y coherencia entre lo que decís y hacés.',
    ],
    desarrollos: [
      'Delegar sin necesidad de revisarlo todo.',
      'Aceptar versiones suficientemente buenas cuando el plazo aprieta.',
      'Dar feedback en tono constructivo, no correctivo.',
    ],
  },
  2: {
    titulo: 'Perfil colaborativo y orientado a las personas',
    resumen:
      'Leés bien las necesidades del equipo y de los clientes, y construís vínculos de confianza que sostienen el trabajo en conjunto.',
    fortaleza: 'Empatía, servicio y construcción de relaciones duraderas.',
    entorno: 'Equipos con trato cercano y roles de contacto directo con personas.',
    desarrollo: 'Poner límites y priorizar tus propios objetivos junto con los del equipo.',
    fortalezas: [
      'Lectura rápida de las necesidades del otro.',
      'Construcción de confianza con clientes y compañeros.',
      'Disposición a sostener al equipo cuando hace falta.',
    ],
    desarrollos: [
      'Poner límites y decir que no sin culpa.',
      'Priorizar tus objetivos junto con los del equipo.',
      'Pedir ayuda y reconocimiento cuando corresponde.',
    ],
  },
  3: {
    titulo: 'Perfil ejecutivo y orientado a resultados',
    resumen:
      'Te enfocás en objetivos y avanzás con eficiencia. Traducís ideas en planes concretos y sostenés el ritmo hasta cerrar.',
    fortaleza: 'Foco en metas, productividad y capacidad de ejecución.',
    entorno: 'Objetivos medibles, feedback frecuente y reconocimiento por desempeño.',
    desarrollo: 'Cuidar el ritmo de trabajo y valorar el proceso, no solo el resultado.',
    fortalezas: [
      'Traducir ideas en planes concretos y medibles.',
      'Sostener el ritmo hasta cerrar lo que empezaste.',
      'Presentar el trabajo con claridad frente a otros.',
    ],
    desarrollos: [
      'Cuidar el ritmo para no acumular sobrecarga.',
      'Valorar el proceso y no solo el resultado visible.',
      'Dar espacio a los tiempos del resto del equipo.',
    ],
  },
  4: {
    titulo: 'Perfil creativo y conceptual',
    resumen:
      'Aportás una mirada propia: ves oportunidades donde otros ven rutina y proponés soluciones originales con criterio estético y de sentido.',
    fortaleza: 'Originalidad, pensamiento conceptual y criterio propio.',
    entorno: 'Espacios que valoran la autoría, la calidad de la idea y la autonomía.',
    desarrollo: 'Sostener la constancia en proyectos largos y en las etapas más operativas.',
    fortalezas: [
      'Ideas originales y soluciones fuera de lo obvio.',
      'Sensibilidad para entender matices que otros pasan por alto.',
      'Criterio propio para defender la calidad de una propuesta.',
    ],
    desarrollos: [
      'Sostener la constancia en las etapas más operativas.',
      'Llevar la idea a un plan de acción concreto.',
      'Trabajar con estándares comunes y no solo propios.',
    ],
  },
  5: {
    titulo: 'Perfil analítico y técnico',
    resumen:
      'Analizás en profundidad antes de decidir. Aportás claridad conceptual y soluciones bien fundamentadas frente a problemas complejos.',
    fortaleza: 'Análisis, pensamiento crítico y dominio técnico de tu área.',
    entorno: 'Trabajo autónomo, problemas complejos y tiempo real para profundizar.',
    desarrollo: 'Compartir avances en proceso y comunicar tus conclusiones al equipo.',
    fortalezas: [
      'Análisis profundo antes de tomar una decisión.',
      'Dominio técnico y aprendizaje autónomo.',
      'Objetividad para separar los datos de la presión del momento.',
    ],
    desarrollos: [
      'Compartir avances antes de tenerlo todo resuelto.',
      'Comunicar conclusiones en lenguaje simple.',
      'Involucrarte en las instancias colectivas del equipo.',
    ],
  },
  6: {
    titulo: 'Perfil confiable y preventivo',
    resumen:
      'Anticipás riesgos y detectás lo que puede fallar antes de que ocurra. Sos un punto de apoyo estable para el equipo.',
    fortaleza: 'Previsión de riesgos, compromiso y confiabilidad.',
    entorno: 'Equipos estables, reglas claras y expectativas bien definidas.',
    desarrollo: 'Decidir con información incompleta y confiar antes en tu propio criterio.',
    fortalezas: [
      'Detección temprana de riesgos y puntos débiles.',
      'Compromiso sostenido con el equipo y la tarea.',
      'Preparación y previsión antes de ejecutar.',
    ],
    desarrollos: [
      'Decidir con información incompleta cuando urge.',
      'Confiar antes en tu propio criterio.',
      'Distinguir el riesgo real del anticipado.',
    ],
  },
  7: {
    titulo: 'Perfil dinámico y generador de ideas',
    resumen:
      'Te movés bien en contextos cambiantes y generás alternativas con rapidez. Aportás energía e impulso al inicio de los proyectos.',
    fortaleza: 'Versatilidad, generación de ideas y adaptación al cambio.',
    entorno: 'Proyectos variados, contextos dinámicos y margen para proponer.',
    desarrollo: 'Priorizar y cerrar lo empezado antes de abrir algo nuevo.',
    fortalezas: [
      'Generación rápida de alternativas frente a un problema.',
      'Adaptación a cambios de contexto y de prioridades.',
      'Energía para impulsar el arranque de un proyecto.',
    ],
    desarrollos: [
      'Cerrar lo empezado antes de abrir algo nuevo.',
      'Sostener el foco en las etapas menos estimulantes.',
      'Profundizar en un tema en lugar de abarcar varios.',
    ],
  },
  8: {
    titulo: 'Perfil decisivo y orientado a la acción',
    resumen:
      'Tomás decisiones y asumís la responsabilidad de sostenerlas. Aportás dirección clara y capacidad de destrabar situaciones.',
    fortaleza: 'Decisión, liderazgo directo y capacidad de asumir responsabilidad.',
    entorno: 'Roles con autonomía real y responsabilidad sobre los resultados.',
    desarrollo: 'Dar lugar a otras opiniones y ajustar el impacto de tu forma directa.',
    fortalezas: [
      'Decisión rápida en situaciones de presión.',
      'Capacidad de destrabar temas que quedaron frenados.',
      'Defensa clara de tu equipo y de tu posición.',
    ],
    desarrollos: [
      'Dar lugar a las opiniones del resto antes de resolver.',
      'Medir el impacto de tu forma directa de comunicar.',
      'Delegar control sin perder el objetivo de vista.',
    ],
  },
  9: {
    titulo: 'Perfil mediador y estable',
    resumen:
      'Integrás distintas posturas y mantenés el clima de trabajo. Aportás una visión de conjunto que ordena a equipos con intereses diversos.',
    fortaleza: 'Mediación, escucha y visión integradora del equipo.',
    entorno: 'Equipos donde la cohesión y la coordinación entre áreas son clave.',
    desarrollo: 'Expresar tu posición con claridad y sostener prioridades ante la presión.',
    fortalezas: [
      'Mediación entre posturas e intereses distintos.',
      'Escucha genuina que baja la tensión del equipo.',
      'Visión de conjunto por encima de la parte.',
    ],
    desarrollos: [
      'Expresar tu posición aunque genere fricción.',
      'Sostener prioridades cuando aparecen urgencias.',
      'Tomar la iniciativa sin esperar consenso total.',
    ],
  },
}
