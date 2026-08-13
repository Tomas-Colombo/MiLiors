/**
 * Prompts para el informe de selección grupal: compara los candidatos
 * candidatos marcados de un puesto y produce un ranking justificado en JSON.
 */

export type CandidatoContexto = {
  nombre: string
  eneatipoNumero: number | null
  eneatipoNombre: string | null
  competencias: string[]
  formaciones: { titulo: string; institucion: string; fecha_graduacion: string | null }[]
  experiencias: { puesto: string; empresa: string; fecha_inicio: string; fecha_fin: string | null }[]
  informePersonalidad: string | null
  notasPrivadas: string[]
}

export type SeleccionContext = {
  tituloPuesto: string
  descripcionPuesto: string | null
  cargaHoraria: string
  ubicacion: string
  nivelExperiencia: string | null
  perfilPsicologicoDeseado: string | null
  candidatos: CandidatoContexto[]
}

/** Estructura que la IA debe devolver (JSON estricto). */
export type InformeSeleccionJSON = {
  resumenEjecutivo: string
  ranking: {
    posicion: number
    nombre: string
    compatibilidad: 'Alta' | 'Media' | 'Baja'
    formacion: string
    estado: string
  }[]
  justificaciones: {
    posicion: number
    nombre: string
    subtitulo: string
    texto: string
  }[]
  menosRelevantes: {
    nombre: string
    texto: string
  }[]
}

export function buildSeleccionPrompts(ctx: SeleccionContext): {
  systemPrompt: string
  userPrompt: string
} {
  const systemPrompt = `Sos un asistente de reclutamiento integrado exclusivamente en esta plataforma.

Tu tarea es generar un INFORME DE SELECCIÓN comparando a todos los candidatos recibidos para un mismo puesto, y establecer un orden de mérito.

REGLAS:
1. Usá únicamente la información recibida. Nunca inventes datos, puntajes numéricos ni títulos que no estén en el contexto.
2. No exageres fortalezas ni debilidades. Fundamentá cada conclusión con evidencia del contexto.
3. Si a un candidato le falta información relevante (informe de personalidad, formación, etc.), indicálo en su justificación en lugar de suponer.
4. Considerá las notas privadas del reclutador como contexto interno y usalas cuando sean relevantes al puesto.
5. Si existen contradicciones entre fuentes, señalalas.
6. Todos los candidatos deben aparecer en "ranking", ordenados del más al menos adecuado.
7. Los candidatos con mejor ajuste van en "justificaciones" (análisis detallado). Los de menor ajuste van en "menosRelevantes" con una explicación breve de por qué son menos relevantes PARA ESTE PUESTO (no están descartados: siguen en el proceso).
8. Un candidato aparece en "justificaciones" O en "menosRelevantes", nunca en ambos.
9. "compatibilidad" es tu evaluación global del ajuste candidato-puesto: "Alta", "Media" o "Baja".
10. "estado" es una etiqueta corta del lugar en el orden de mérito, por ejemplo: "Recomendado (perfil ideal)", "Elegible (fuerte perfil técnico)", "Menos relevante para el puesto". Nunca uses las palabras "Seleccionado" ni "Descartado": la decisión es del reclutador.

FORMATO DE SALIDA:
Respondé ÚNICAMENTE con un objeto JSON válido, sin texto adicional ni bloques de código, con este esquema exacto:
{
  "resumenEjecutivo": "párrafo que introduce el orden de mérito y los criterios usados",
  "ranking": [
    { "posicion": 1, "nombre": "...", "compatibilidad": "Alta" | "Media" | "Baja", "formacion": "síntesis de su formación en pocas palabras", "estado": "..." }
  ],
  "justificaciones": [
    { "posicion": 1, "nombre": "...", "subtitulo": "etiqueta corta, ej: Recomendado (perfil ideal)", "texto": "análisis de 3 a 6 oraciones" }
  ],
  "menosRelevantes": [
    { "nombre": "...", "texto": "explicación de 2 a 4 oraciones de por qué es menos relevante para este puesto" }
  ]
}

Idioma: Español.`

  const puestoLines: string[] = [
    `Título: ${ctx.tituloPuesto}`,
    `Modalidad: ${ctx.cargaHoraria} · ${ctx.ubicacion}`,
  ]
  if (ctx.nivelExperiencia) puestoLines.push(`Nivel requerido: ${ctx.nivelExperiencia}`)
  if (ctx.descripcionPuesto) puestoLines.push(`Descripción: ${ctx.descripcionPuesto.slice(0, 600)}`)
  if (ctx.perfilPsicologicoDeseado)
    puestoLines.push(`Perfil psicológico buscado: ${ctx.perfilPsicologicoDeseado}`)

  const candidatosSections = ctx.candidatos.map((c, i) => {
    const eneatipo =
      c.eneatipoNumero != null
        ? `Eneatipo ${c.eneatipoNumero} — ${c.eneatipoNombre}`
        : 'No disponible'

    const perfilTecnico: string[] = []
    if (c.competencias.length > 0) {
      perfilTecnico.push(`Competencias: ${c.competencias.join(', ')}`)
    }
    if (c.formaciones.length > 0) {
      const fList = c.formaciones
        .map(
          (f) =>
            `  • ${f.titulo} — ${f.institucion}${f.fecha_graduacion ? ` (${f.fecha_graduacion.slice(0, 4)})` : ''}`
        )
        .join('\n')
      perfilTecnico.push(`Formación académica:\n${fList}`)
    }
    if (c.experiencias.length > 0) {
      const eList = c.experiencias
        .map((e) => {
          const fin = e.fecha_fin ? e.fecha_fin.slice(0, 7) : 'actualidad'
          return `  • ${e.puesto} en ${e.empresa} (${e.fecha_inicio.slice(0, 7)} – ${fin})`
        })
        .join('\n')
      perfilTecnico.push(`Experiencia laboral:\n${eList}`)
    }

    const notasSection =
      c.notasPrivadas.length > 0
        ? c.notasPrivadas.map((n, j) => `  [${j + 1}] ${n}`).join('\n')
        : 'Sin notas.'

    return `=== CANDIDATO ${i + 1}: ${c.nombre} ===
Eneatipo: ${eneatipo}

PERFIL TÉCNICO:
${perfilTecnico.length > 0 ? perfilTecnico.join('\n\n') : 'No disponible.'}

INFORME DE PERSONALIDAD:
${c.informePersonalidad ? c.informePersonalidad.slice(0, 1500) : 'No disponible.'}

NOTAS PRIVADAS DEL RECLUTADOR:
${notasSection}`
  })

  const userPrompt = `=== PUESTO ===
${puestoLines.join('\n')}

${candidatosSections.join('\n\n')}

=== TAREA ===
Generá el informe de selección comparando a los ${ctx.candidatos.length} candidatos para este puesto, siguiendo el esquema JSON indicado.`

  return { systemPrompt, userPrompt }
}
