import type { FormacionItem, ExperienciaItem, IdiomaItem, CompetenciaItem } from '@/modules/perfil-tecnico/queries'
import type { HumanDesignData } from '@/modules/human-design/queries'

// ─── Nombres de eneatipos para el prompt ─────────────────────────────────────
const NOMBRE_ENEATIPO: Record<number, string> = {
  1: 'El Perfeccionista',
  2: 'El Ayudador',
  3: 'El Triunfador',
  4: 'El Individualista',
  5: 'El Investigador',
  6: 'El Leal',
  7: 'El Entusiasta',
  8: 'El Desafiador',
  9: 'El Pacificador',
}

export type InformeContext = {
  nombreCompleto: string
  especificidadPuesto: string | null
  eneatipoNumero: number
  humanDesign: HumanDesignData | null
  formaciones: FormacionItem[]
  experiencias: ExperienciaItem[]
  idiomas: IdiomaItem[]
  competencias: CompetenciaItem[]
}

/**
 * Builds the system prompt and user prompt for report generation.
 * Keeping prompts separate from service logic allows changing them without touching the service.
 */
export function buildInformePrompts(ctx: InformeContext): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `Sos un psicólogo organizacional experto en Eneagrama y Human Design aplicados al desarrollo profesional. 
Tu tarea es redactar un Informe de Personalidad Profesional para un candidato laboral.

FORMATO DE SALIDA:
- Redacción en español (Argentina), primera persona del singular hacia el candidato ("Tu perfil...")
- Entre 500 y 1500 palabras
- Estructura sugerida:
  1. Perfil de personalidad (basado en Eneatipo, ~200 palabras)
  2. Fortalezas clave en entorno laboral (~200 palabras)
  3. Áreas de desarrollo y desafíos (~150 palabras)
  4. Compatibilidad con entornos de trabajo (~200 palabras)
  5. Recomendaciones para reclutadores (~150 palabras)
- Tono: profesional, empático, basado en evidencia del marco
- No inventar rasgos no sustentados por el Eneatipo o el Human Design
- Si no hay datos de Human Design, omitir esa sección del análisis
- No mencionar el número de eneatipo en forma de etiqueta técnica — integrarlo naturalmente`

  // Build compact technical profile section
  const formacionStr = ctx.formaciones.length > 0
    ? ctx.formaciones.map(f => `  - ${f.titulo} en ${f.institucion}${f.fecha_graduacion ? ` (${f.fecha_graduacion})` : ''}`).join('\n')
    : '  - No especificada'

  const expStr = ctx.experiencias.length > 0
    ? ctx.experiencias.map(e => `  - ${e.puesto} en ${e.empresa} (${e.fecha_inicio} → ${e.fecha_fin ?? 'actualidad'})`).join('\n')
    : '  - Sin experiencia laboral registrada'

  const idiomasStr = ctx.idiomas.length > 0
    ? ctx.idiomas.map(i => `${i.nombre} (${i.nivel_idioma})`).join(', ')
    : 'No especificados'

  const competenciasStr = ctx.competencias.length > 0
    ? ctx.competencias.map(c => c.nombre).join(', ')
    : 'No especificadas'

  const hdStr = ctx.humanDesign
    ? `Human Design:
  - Tipo energético: ${ctx.humanDesign.tipo_energetico}
  - Autoridad: ${ctx.humanDesign.autoridad_hd}
  - Perfil: ${ctx.humanDesign.perfil_hd}
  - Estrategia: ${ctx.humanDesign.estrategia_hd}`
    : 'Human Design: No proporcionado'

  const userPrompt = `Redactá el Informe de Personalidad Profesional para el siguiente candidato:

DATOS DEL CANDIDATO:
Nombre: ${ctx.nombreCompleto}
Búsqueda laboral: ${ctx.especificidadPuesto ?? 'No especificada'}

PERFIL PSICOLÓGICO:
Eneatipo: ${ctx.eneatipoNumero} — ${NOMBRE_ENEATIPO[ctx.eneatipoNumero] ?? 'Desconocido'}
${hdStr}

PERFIL TÉCNICO:
Formación académica:
${formacionStr}

Experiencia laboral:
${expStr}

Idiomas: ${idiomasStr}
Competencias clave: ${competenciasStr}

Redactá el informe completo siguiendo las instrucciones del sistema.`

  return { systemPrompt, userPrompt }
}
