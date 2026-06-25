import type { FormacionItem, ExperienciaItem, IdiomaItem, CompetenciaItem } from '@/modules/perfil-tecnico/queries'
import type { HumanDesignData } from '@/modules/human-design/queries'

export type DominanteInfo = {
  numero: number
  nombre: string
  puntajeCrudo: number
  porcentaje: number
}

export type InformeContext = {
  nombreCompleto: string
  especificidadPuesto: string | null
  dominantes: DominanteInfo[]
  tieneEmpateDominante: boolean
  humanDesign: HumanDesignData | null
  formaciones: FormacionItem[]
  experiencias: ExperienciaItem[]
  idiomas: IdiomaItem[]
  competencias: CompetenciaItem[]
}

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
- No mencionar el número de eneatipo en forma de etiqueta técnica — integrarlo naturalmente
- Si hay empate de eneatipos dominantes, analizá las confluencias y tensiones entre ambos tipos sin elegir uno arbitrariamente`

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
  - Categoría de energía: ${ctx.humanDesign.energy_type_classification ?? 'No especificada'}
  - Autoridad interna: ${ctx.humanDesign.autoridad_hd}
  - Perfil: ${ctx.humanDesign.perfil_hd}
  - Estrategia: ${ctx.humanDesign.estrategia_hd}`
    : 'Human Design: No proporcionado'

  let eneatipoStr: string
  if (ctx.tieneEmpateDominante) {
    eneatipoStr = `Eneatipos dominantes (EMPATE):
${ctx.dominantes.map(d => `  - Tipo ${d.numero} — ${d.nombre} (puntaje: ${d.puntajeCrudo}, ${d.porcentaje}%)`).join('\n')}
Nota: el candidato presenta puntaje idéntico en estos tipos. Analizá las confluencias y divergencias entre ambos.`
  } else {
    const d = ctx.dominantes[0]
    eneatipoStr = `Eneatipo: ${d.numero} — ${d.nombre}`
  }

  const userPrompt = `Redactá el Informe de Personalidad Profesional para el siguiente candidato:

DATOS DEL CANDIDATO:
Nombre: ${ctx.nombreCompleto}
Búsqueda laboral: ${ctx.especificidadPuesto ?? 'No especificada'}

PERFIL PSICOLÓGICO:
${eneatipoStr}
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
