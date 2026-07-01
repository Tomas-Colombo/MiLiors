export type AsistenteContext = {
  // Candidate
  nombrePostulante: string
  eneatipoNumero: number | null
  eneatipoNombre: string | null
  competencias: string[]
  formaciones: { titulo: string; institucion: string; fecha_graduacion: string | null }[]
  experiencias: { puesto: string; empresa: string; fecha_inicio: string; fecha_fin: string | null }[]
  // Personality report
  informePersonalidad: string | null
  // Position
  tituloPuesto: string
  descripcionPuesto: string | null
  cargaHoraria: string
  ubicacion: string
  nivelExperiencia: string | null
  perfilPsicologicoDeseado: string | null
  // Recruiter private notes for this candidate
  notasPrivadas: string[]
  // Recruiter's free-text query
  pregunta: string
}

export function buildAsistentePrompts(ctx: AsistenteContext): {
  systemPrompt: string
  userPrompt: string
} {
  const systemPrompt = `Sos un asistente de reclutamiento integrado exclusivamente en esta plataforma.

Tu función es ayudar a los reclutadores a analizar candidatos utilizando únicamente la información que recibís en cada consulta.

La información disponible puede incluir:
- Datos del puesto.
- Informe de personalidad del candidato.
- Notas privadas del reclutador.
- Información adicional escrita por el reclutador.
- La consulta realizada por el usuario.

REGLAS:
1. Respondé únicamente utilizando la información recibida.
2. Nunca inventes información ni hagas suposiciones.
3. Si falta información necesaria para responder correctamente, indicá qué información falta.
4. No respondas preguntas ajenas al proceso de selección.
5. Si el usuario hace preguntas fuera del contexto de reclutamiento o selección de personal, respondé únicamente: "Solo puedo ayudar con el análisis de candidatos y puestos dentro de esta plataforma."
6. No utilices conocimientos externos para completar información faltante.
7. Considerá las notas privadas como contexto interno del reclutador y utilizalas cuando sean relevantes.
8. Si existen contradicciones entre las distintas fuentes de información, indicalas claramente.

ANÁLISIS:
Cuando el usuario solicite evaluar un candidato:
- Analizá la compatibilidad entre el candidato y el puesto.
- Fundamentá cada conclusión utilizando únicamente evidencia presente en la información recibida.
- No exageres fortalezas ni debilidades.
- Si detectás posibles riesgos o dudas, mencionálos.
- Si la información es insuficiente para emitir una conclusión, indicá qué información adicional sería útil.

FORMATO (cuando aplique):
Compatibilidad: Alta / Media / Baja
Motivos: • ...
Riesgos o posibles desafíos: • ...
Recomendación: ...
Información faltante: ... (solo si aplica)

OPTIMIZACIÓN:
- Respondé de forma clara, profesional y objetiva.
- Priorizá responder directamente la consulta antes de resumir el contexto.
- No repitas el informe de personalidad completo. Solo mencioná los fragmentos relevantes.
- Evitá explicaciones innecesarias y repetir información.
- Utilizá listas cuando sea posible.
- Tus respuestas no deben superar las 200 palabras, salvo que el usuario solicite explícitamente un análisis detallado.
- Si la respuesta puede darse en menos palabras sin perder calidad, hacelo.

Idioma de respuesta: Español.`

  // --- Build user prompt sections ---

  const eneatipo =
    ctx.eneatipoNumero != null
      ? `Eneatipo ${ctx.eneatipoNumero} — ${ctx.eneatipoNombre}`
      : 'No disponible'

  const perfilTecnico: string[] = []
  if (ctx.competencias.length > 0) {
    perfilTecnico.push(`Competencias: ${ctx.competencias.join(', ')}`)
  }
  if (ctx.formaciones.length > 0) {
    const fList = ctx.formaciones
      .map((f) => `  • ${f.titulo} — ${f.institucion}${f.fecha_graduacion ? ` (${f.fecha_graduacion.slice(0, 4)})` : ''}`)
      .join('\n')
    perfilTecnico.push(`Formación académica:\n${fList}`)
  }
  if (ctx.experiencias.length > 0) {
    const eList = ctx.experiencias
      .map((e) => {
        const fin = e.fecha_fin ? e.fecha_fin.slice(0, 7) : 'actualidad'
        return `  • ${e.puesto} en ${e.empresa} (${e.fecha_inicio.slice(0, 7)} – ${fin})`
      })
      .join('\n')
    perfilTecnico.push(`Experiencia laboral:\n${eList}`)
  }

  const notasSection =
    ctx.notasPrivadas.length > 0
      ? ctx.notasPrivadas.map((n, i) => `  [${i + 1}] ${n}`).join('\n')
      : 'Sin notas.'

  const informeSection = ctx.informePersonalidad
    ? ctx.informePersonalidad.slice(0, 1500)
    : 'No disponible.'

  const puestoLines: string[] = [
    `Título: ${ctx.tituloPuesto}`,
    `Modalidad: ${ctx.cargaHoraria} · ${ctx.ubicacion}`,
  ]
  if (ctx.nivelExperiencia) puestoLines.push(`Nivel requerido: ${ctx.nivelExperiencia}`)
  if (ctx.descripcionPuesto) puestoLines.push(`Descripción: ${ctx.descripcionPuesto.slice(0, 600)}`)
  if (ctx.perfilPsicologicoDeseado) puestoLines.push(`Perfil psicológico buscado: ${ctx.perfilPsicologicoDeseado}`)

  const userPrompt = `=== CANDIDATO: ${ctx.nombrePostulante} ===
Eneatipo: ${eneatipo}

PERFIL TÉCNICO:
${perfilTecnico.length > 0 ? perfilTecnico.join('\n\n') : 'No disponible.'}

INFORME DE PERSONALIDAD:
${informeSection}

NOTAS PRIVADAS DEL RECLUTADOR:
${notasSection}

=== PUESTO ===
${puestoLines.join('\n')}

=== CONSULTA DEL RECLUTADOR ===
${ctx.pregunta}`

  return { systemPrompt, userPrompt }
}
