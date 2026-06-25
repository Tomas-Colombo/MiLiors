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
Tu tarea es generar un Informe de Personalidad Profesional para un candidato laboral.

FORMATO DE SALIDA OBLIGATORIO:
Respondé ÚNICAMENTE con un objeto JSON válido con exactamente estas 5 claves (sin markdown, sin bloques de código, sin texto adicional):
{
  "perfil_personalidad": "...",
  "fortalezas_laborales": "...",
  "areas_desarrollo": "...",
  "compatibilidad_entorno": "...",
  "recomendaciones_reclutadores": "..."
}

GUÍA DE CONTENIDO POR SECCIÓN (en español de Argentina, tono profesional y empático):
- perfil_personalidad: Análisis del eneatipo en relación al perfil profesional (~200 palabras). Dirigido al candidato en segunda persona ("Tu perfil...").
- fortalezas_laborales: Fortalezas clave aplicadas al entorno laboral (~200 palabras).
- areas_desarrollo: Áreas de crecimiento y desafíos a trabajar (~150 palabras).
- compatibilidad_entorno: Tipos de entornos y culturas organizacionales donde el candidato prospera (~200 palabras).
- recomendaciones_reclutadores: Guía para entrevistadores sobre cómo aprovechar el perfil (~150 palabras).

REGLAS:
- No inventar rasgos no sustentados por el Eneatipo o el Human Design
- Si no hay datos de Human Design, omitir ese análisis en las secciones
- No mencionar el número de eneatipo como etiqueta técnica — integrarlo naturalmente al texto
- Si hay empate de eneatipos dominantes, analizá confluencias y tensiones entre ambos`

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

  const userPrompt = `Generá el Informe de Personalidad Profesional para el siguiente candidato y devolvé SOLO el JSON:

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
Competencias clave: ${competenciasStr}`

  return { systemPrompt, userPrompt }
}
