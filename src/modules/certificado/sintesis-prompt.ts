/**
 * Prompt de la síntesis integrada del certificado.
 *
 * El LLM recibe la personalidad YA REDACTADA (condensada del informe) + el
 * material técnico (competencias y experiencia). Su única tarea es tejer un
 * "perfil profesional integrado" en 3ª persona y declarar QUÉ competencias
 * técnicas logró integrar. NO calcula nada; NO inventa datos; las competencias
 * que no integre las agrega el sistema al final (no debe forzarlas).
 */

export type SintesisPromptContext = {
  nombre: string
  /** Posicionamiento breve del informe (opcional). */
  subtitulo: string | null
  /** Párrafo de personalidad ya redactado por el informe. */
  descripcionPersonalidad: string
  /** Nombres de los talentos top del informe (anclas para tejer). */
  talentos: string[]
  /** Competencias técnicas vigentes del perfil (nombres). */
  competenciasTecnicas: string[]
  /** Experiencia laboral (material técnico a hilar). */
  experiencias: { puesto: string; empresa: string; descripcion: string | null }[]
}

function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] || nombre
}

export function buildSintesisPrompts(ctx: SintesisPromptContext): {
  systemPrompt: string
  userPrompt: string
} {
  const nombre = primerNombre(ctx.nombre)

  const systemPrompt = `Sos un consultor de talento. Redactás en español rioplatense, en TERCERA PERSONA (ej: "${nombre} combina...", "Su experiencia..."). Prohibido "tú" y "vos".

Tu tarea: escribir un PERFIL PROFESIONAL INTEGRADO para un certificado. Es un CV en prosa: la personalidad (ya provista) aporta el "cómo" y la trayectoria técnica (experiencia y competencias) aporta el "qué". Entrelazá ambas de forma natural y concreta.

PROHIBIDO: inventar experiencia, títulos o competencias no provistas; recalcular o mencionar niveles, puntajes o porcentajes; exagerar o adular.

Integrá SOLO las competencias técnicas que encajen naturalmente con algún rasgo o experiencia. Las que no encajen NO las fuerces: el sistema las agrega aparte al final.

EXTENSIÓN: 2 o 3 párrafos, en total 6-9 oraciones. Conciso, sin relleno.

FORMATO DE SALIDA: respondé ÚNICAMENTE con un objeto JSON válido (sin markdown, sin texto extra) con esta forma EXACTA:
{
  "perfilIntegrado": "string — 2-3 párrafos en 3ª persona, personalidad + técnica entrelazadas (separá párrafos con \\n\\n)",
  "competenciasIntegradas": ["string — nombre EXACTO de cada competencia técnica que mencionaste en el texto"]
}`

  const compStr = ctx.competenciasTecnicas.length
    ? ctx.competenciasTecnicas.map(c => `  - ${c}`).join('\n')
    : '  (sin competencias técnicas cargadas)'

  const expStr = ctx.experiencias.length
    ? ctx.experiencias
        .map(e => {
          const desc = e.descripcion?.trim() ? ` — ${e.descripcion.trim()}` : ''
          return `  - ${e.puesto} en ${e.empresa}${desc}`
        })
        .join('\n')
    : '  (sin experiencia cargada)'

  const talentosStr = ctx.talentos.length ? ctx.talentos.join(', ') : 'no especificados'

  const userPrompt = `Redactá el perfil integrado para el siguiente candidato y devolvé SOLO el JSON.

CANDIDATO: ${nombre}
${ctx.subtitulo ? `POSICIONAMIENTO: ${ctx.subtitulo}` : ''}

SÍNTESIS DE PERSONALIDAD (ya redactada, condensala, no la copies literal):
${ctx.descripcionPersonalidad}

TALENTOS: ${talentosStr}

COMPETENCIAS TÉCNICAS (integrá por nombre EXACTO las que encajen; no fuerces las que no):
${compStr}

EXPERIENCIA:
${expStr}`

  return { systemPrompt, userPrompt }
}
