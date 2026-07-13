/**
 * Prompt del Informe de Personalidad (rediseño 2026).
 *
 * El LLM recibe el resultado YA CALCULADO del motor y SOLO escribe prosa en
 * 3ª persona. Tiene prohibido calcular niveles, barras o rankings.
 */

import { COMO_TRABAJAS_TITULOS, type MotorResultado } from './competencias'

export type InformePromptContext = {
  nombre: string
  especificidadPuesto: string | null
  motor: MotorResultado
  humanDesign: {
    tipo_energetico: string
    autoridad_hd: string
    perfil_hd: string
    estrategia_hd: string
  } | null
}

export function buildInformePrompts(ctx: InformePromptContext): { systemPrompt: string; userPrompt: string } {
  const { motor } = ctx
  const titulos = COMO_TRABAJAS_TITULOS.join('\n  - ')

  const systemPrompt = `Sos un consultor de talento experto en Eneagrama y Human Design aplicados al mundo laboral.
Escribís en español de Argentina, en TERCERA PERSONA (ej: "${primerNombre(ctx.nombre)} presenta...", "Su enfoque comercial...").
Tono consultivo, cálido y concreto. Prohibido el "tú" y el "vos": siempre 3ª persona.

Recibís un perfil YA CALCULADO por un motor determinístico. Tu ÚNICA tarea es redactar prosa.
PROHIBIDO: calcular o mencionar niveles, barras, puntajes, porcentajes o rankings; el motor ya los resolvió.
PROHIBIDO: inventar competencias o talentos distintos a los provistos.

EXTENSIÓN (respetala, no infles): cada descripción de competencia = 1 oración; cada talento = 2-4 oraciones; cada ítem de "cómo trabajás" = 2-4 oraciones; la descripción de personalidad = 1 párrafo (4-6 oraciones).

FORMATO DE SALIDA: respondé ÚNICAMENTE con un objeto JSON válido (sin markdown, sin texto extra) con esta forma EXACTA:
{
  "subtitulo": "string — posicionamiento breve, ~6-10 palabras, ej 'Perfil comercial y relacional con impulso creativo'",
  "descripcionPersonalidad": "string — un párrafo en 3ª persona: inteligencia emocional, orientación, energía, estilo de liderazgo y forma de comunicar",
  "competenciasDesc": [ { "nombre": "string — EXACTO como se listó", "descripcion": "string — 1 oración en 3ª persona" } ],
  "talentosDesc": [ { "nombre": "string — EXACTO como se listó", "descripcion": "string — 2-4 oraciones en 3ª persona" } ],
  "comoTrabajas": [ { "titulo": "string — EXACTO de la lista", "texto": "string — 2-4 oraciones en 3ª persona" } ]
}

REGLAS DE ARMADO:
- "competenciasDesc" debe tener una entrada por CADA competencia provista (13), usando el mismo "nombre".
- "talentosDesc" debe tener una entrada por CADA talento del top-4 provisto (4), usando el mismo "nombre".
- "comoTrabajas" debe tener EXACTAMENTE estos ${COMO_TRABAJAS_TITULOS.length} títulos, en este orden, combinando el estilo dominante y el secundario:
  - ${titulos}`

  const competenciasStr = motor.competencias
    .map(c => `  - ${c.nombre} [${c.bloque}] → nivel ${c.nivel}`)
    .join('\n')

  const talentosStr = motor.talentosTop.map((t, i) => `  ${i + 1}. ${t.nombre} (nivel ${t.nivel})`).join('\n')

  const hdStr = ctx.humanDesign
    ? `Human Design:
  - Tipo energético: ${ctx.humanDesign.tipo_energetico}
  - Autoridad interna: ${ctx.humanDesign.autoridad_hd}
  - Perfil: ${ctx.humanDesign.perfil_hd}
  - Estrategia: ${ctx.humanDesign.estrategia_hd}`
    : 'Human Design: no proporcionado (no lo menciones).'

  const userPrompt = `Redactá el informe para el siguiente perfil y devolvé SOLO el JSON.

CANDIDATO:
Nombre: ${ctx.nombre}
Búsqueda laboral: ${ctx.especificidadPuesto ?? 'no especificada'}

ESTILO (Eneagrama):
  - Dominante: Eneatipo ${motor.estiloDominante.numero} — ${motor.estiloDominante.nombre}
  - Secundario: Eneatipo ${motor.estiloSecundario.numero} — ${motor.estiloSecundario.nombre}

${hdStr}

COMPETENCIAS (13, con su nivel ya calculado — NO recalcules):
${competenciasStr}

TOP-4 TALENTOS (ya rankeados — escribí 1 párrafo por cada uno):
${talentosStr}`

  return { systemPrompt, userPrompt }
}

function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] || nombre
}
