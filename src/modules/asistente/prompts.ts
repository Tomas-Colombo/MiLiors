export type AsistenteContext = {
  // Candidate
  nombrePostulante: string
  eneatipoNumero: number | null
  eneatipoNombre: string | null
  humanDesign: {
    tipo_energetico: string
    autoridad_hd: string
    perfil_hd: string
    estrategia_hd: string
  } | null
  competencias: string[]
  // Position (includes recruiter-private fields)
  tituloPuesto: string
  descripcionPuesto: string | null
  cargaHoraria: string
  ubicacion: string
  perfilPsicologicoDeseado: string | null
  // Question
  pregunta: string
}

export function buildAsistentePrompts(ctx: AsistenteContext): {
  systemPrompt: string
  userPrompt: string
} {
  const systemPrompt = `Sos un asistente de reclutamiento especializado en compatibilidad persona-puesto, con conocimiento en Eneagrama y Human Design aplicados al entorno laboral.

Tu tarea es responder preguntas del reclutador sobre la compatibilidad entre un candidato y un puesto específico.

REGLAS:
- Respondé en español (Argentina), de forma directa y práctica
- Máximo 300 palabras por respuesta
- Basate SOLO en los datos provistos — no inventés rasgos
- Destacá fortalezas y posibles fricciones con el rol
- Si no hay suficiente información, indicalo claramente`

  const hdStr = ctx.humanDesign
    ? `Human Design: ${ctx.humanDesign.tipo_energetico} · Autoridad: ${ctx.humanDesign.autoridad_hd} · Perfil: ${ctx.humanDesign.perfil_hd}`
    : 'Human Design: No disponible'

  const userPrompt = `CANDIDATO: ${ctx.nombrePostulante}
Eneatipo: ${ctx.eneatipoNumero != null ? `${ctx.eneatipoNumero} — ${ctx.eneatipoNombre}` : 'No disponible'}
${hdStr}
Competencias: ${ctx.competencias.length > 0 ? ctx.competencias.join(', ') : 'No especificadas'}

PUESTO: ${ctx.tituloPuesto}
Modalidad: ${ctx.cargaHoraria} · ${ctx.ubicacion}
${ctx.descripcionPuesto ? `Descripción: ${ctx.descripcionPuesto.slice(0, 500)}` : ''}
${ctx.perfilPsicologicoDeseado ? `Perfil psicológico buscado: ${ctx.perfilPsicologicoDeseado}` : ''}

PREGUNTA DEL RECLUTADOR: ${ctx.pregunta}`

  return { systemPrompt, userPrompt }
}
