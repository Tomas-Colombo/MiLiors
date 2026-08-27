/**
 * Prompts de la síntesis integrada del certificado. Son dos pasos:
 *
 * 1. TRIAGE (`buildTriagePrompts`) — mide el perfil técnico contra la búsqueda
 *    declarada ("¿Qué estudiaste / qué buscás?") y devuelve SOLO lo que hay que
 *    descartar. Un reclutador lee el certificado con el reloj corriendo: la
 *    experiencia volando aviones de quien busca programar le hace perder tiempo
 *    y diluye lo que sí importa.
 * 2. REDACCIÓN (`buildSintesisPrompts`) — recibe la personalidad YA REDACTADA
 *    (condensada del informe) + el material técnico YA FILTRADO (con duraciones
 *    calculadas acá) y teje un "perfil profesional integrado" en 3ª persona,
 *    declarando qué competencias técnicas logró integrar. NO calcula nada; NO
 *    inventa datos; las competencias que no integre las agrega el sistema al
 *    final (no debe forzarlas).
 *
 * El objetivo NO es replicar el informe de personalidad —que ya tiene su propia
 * sección— sino usarlo como el "cómo" que explica el "qué" de la trayectoria.
 */

export type SintesisFormacion = {
  id: string
  titulo: string
  institucion: string
  fechaGraduacion: string | null
}

export type SintesisCurso = {
  id: string
  nombre: string
  institucion: string
  fechaFin: string | null
  duracionHoras: number | null
}

export type SintesisExperiencia = {
  id: string
  puesto: string
  empresa: string
  fechaInicio: string
  fechaFin: string | null
  descripcion: string | null
}

export type SintesisPromptContext = {
  nombre: string
  /**
   * "¿Qué estudiaste / qué buscás?" del perfil. Es el eje del certificado: sin
   * esto no hay contra qué medir la relevancia, por eso nunca puede venir vacío.
   */
  objetivo: string
  /** Posicionamiento breve del informe (opcional). */
  subtitulo: string | null
  /** Párrafo de personalidad ya redactado por el informe. */
  descripcionPersonalidad: string
  /** Talentos top del informe con su descripción — anclas para tejer. */
  talentos: { nombre: string; descripcion: string }[]
  /** Competencias del informe con nivel Alto/Medio-Alto — material de fondo, NO se listan. */
  competenciasDestacadas: { nombre: string; nivel: string }[]
  /** Ítems de estilo del informe ("cómo trabaja") — material de fondo, NO se copian. */
  comoTrabaja: { titulo: string; texto: string }[]
  /** Competencias técnicas vigentes del perfil (nombres). */
  competenciasTecnicas: string[]
  /** Formación académica cargada. */
  formaciones: SintesisFormacion[]
  /** Cursos y capacitaciones complementarias. */
  cursos: SintesisCurso[]
  /** Experiencia laboral (material técnico a hilar). */
  experiencias: SintesisExperiencia[]
  /** Idiomas cargados. */
  idiomas: { nombre: string; nivel: string }[]
  /**
   * Si el titular expone su informe de personalidad en la página de verificación
   * (`perfil_postulante.mostrar_personalidad_publico`). Solo si es `true` el
   * certificado puede invitar a escanear el QR para leerlo: prometer un informe
   * que el QR no va a mostrar es una promesa rota en un documento firmado.
   */
  personalidadPublica: boolean
}

/** Lo único que el triage necesita: la búsqueda y el material técnico a medir. */
export type TriageContext = Pick<
  SintesisPromptContext,
  'objetivo' | 'competenciasTecnicas' | 'formaciones' | 'cursos' | 'experiencias'
>

const MESES = ['', 'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] || nombre
}

/** 'YYYY-MM' | 'YYYY-MM-DD' → 'mar 2021'. Devuelve el crudo si no matchea. */
function formatMes(iso: string): string {
  const [anio, mes] = iso.split('-')
  const m = parseInt(mes ?? '', 10)
  return m >= 1 && m <= 12 ? `${MESES[m]} ${anio}` : iso
}

/** 'YYYY-MM(-DD)' → índice comparable (año * 12 + mes). NaN si no parsea. */
function indiceMes(iso: string): number {
  const [a, m] = iso.split('-')
  const anio = parseInt(a, 10)
  return Number.isFinite(anio) ? anio * 12 + (parseInt(m ?? '1', 10) || 1) : NaN
}

/** Índice del mes en curso — la referencia contra la que se decide qué ya terminó. */
function indiceHoy(): number {
  const hoy = new Date()
  return hoy.getFullYear() * 12 + (hoy.getMonth() + 1)
}

/** Meses transcurridos entre dos fechas 'YYYY-MM(-DD)'. `fin` null = hoy. */
function mesesEntre(inicio: string, fin: string | null): number {
  const parse = (iso: string) => {
    const [a, m] = iso.split('-')
    return { anio: parseInt(a, 10), mes: parseInt(m ?? '1', 10) || 1 }
  }
  const i = parse(inicio)
  if (!Number.isFinite(i.anio)) return 0
  const f = fin ? parse(fin) : { anio: new Date().getFullYear(), mes: new Date().getMonth() + 1 }
  if (!Number.isFinite(f.anio)) return 0
  return Math.max(0, (f.anio - i.anio) * 12 + (f.mes - i.mes))
}

/** 16 → '1 año 4 meses'. El LLM tiene prohibido calcular esto. */
function formatDuracion(meses: number): string {
  const anios = Math.floor(meses / 12)
  const resto = meses % 12
  const partes: string[] = []
  if (anios > 0) partes.push(`${anios} ${anios === 1 ? 'año' : 'años'}`)
  if (resto > 0) partes.push(`${resto} ${resto === 1 ? 'mes' : 'meses'}`)
  return partes.length ? partes.join(' ') : 'menos de un mes'
}

/**
 * Antigüedad total, sumando los meses de cada experiencia. Los períodos
 * solapados se cuentan una sola vez para no inflar la cifra.
 *
 * Se calcula sobre la experiencia YA FILTRADA por el triage: la cifra que cita
 * el certificado es la antigüedad RELEVANTE para la búsqueda, no la de toda la
 * vida laboral. Contar los años volando aviones de quien busca programar sería
 * exactamente el ruido que el triage vino a sacar.
 */
function antiguedadTotal(experiencias: SintesisExperiencia[]): string | null {
  if (experiencias.length === 0) return null

  const hoy = new Date()
  const finPorDefecto = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
  const aIndice = (iso: string) => {
    const [a, m] = iso.split('-')
    const anio = parseInt(a, 10)
    return Number.isFinite(anio) ? anio * 12 + (parseInt(m ?? '1', 10) || 1) : NaN
  }

  const rangos = experiencias
    .map(e => ({ desde: aIndice(e.fechaInicio), hasta: aIndice(e.fechaFin ?? finPorDefecto) }))
    .filter(r => Number.isFinite(r.desde) && Number.isFinite(r.hasta) && r.hasta > r.desde)
    .sort((a, b) => a.desde - b.desde)

  if (rangos.length === 0) return null

  // Unir solapamientos antes de sumar.
  let meses = 0
  let actual = { ...rangos[0] }
  for (const r of rangos.slice(1)) {
    if (r.desde <= actual.hasta) {
      actual.hasta = Math.max(actual.hasta, r.hasta)
    } else {
      meses += actual.hasta - actual.desde
      actual = { ...r }
    }
  }
  meses += actual.hasta - actual.desde

  return formatDuracion(meses)
}

/**
 * Paso 1: qué material técnico NO aporta a la búsqueda declarada.
 *
 * Pedimos SOLO la lista de descartes (no la de conservados) a propósito: si el
 * modelo se queda corto o devuelve basura, el default es conservar todo. Un
 * certificado con un ítem de más es un problema menor; uno al que se le comió la
 * mitad del perfil, no.
 */
export function buildTriagePrompts(ctx: TriageContext): {
  systemPrompt: string
  userPrompt: string
} {
  const systemPrompt = `Sos un reclutador senior. Recibís el perfil técnico completo de un candidato y la BÚSQUEDA que declaró (qué estudió / qué busca). Tu única tarea: marcar qué ítems NO aportan nada a un reclutador que lo evalúa PARA ESA BÚSQUEDA.

Lo que sobrevive va a un certificado que un reclutador lee antes de entrevistarlo, con poco tiempo: cada ítem sin relación le hace perder minutos y le tapa lo que importa.

CONSERVÁ el ítem (o sea, NO lo pongas en la lista) si cumple AL MENOS UNA:
- Es del rubro de la búsqueda o de uno adyacente (ej: soporte técnico para quien busca desarrollo).
- Aporta una capacidad que un reclutador de ESA búsqueda pesaría de verdad (liderar equipos, gestionar proyectos, analizar datos, trato con clientes si la búsqueda lo requiere).
- Es la formación que habilita la búsqueda, esté terminada o en curso.
- Es una herramienta o idioma de uso transversal en esa búsqueda.

DESCARTÁ el ítem sólo si un reclutador de esa búsqueda no cambiaría en nada su decisión al leerlo: pertenece a otro mundo laboral y no deja ninguna capacidad aprovechable. Ejemplos: piloto de avión para quien busca programar; un curso de repostería para quien busca contabilidad.

REGLAS DURAS:
- ANTE LA DUDA, CONSERVÁ. Descartá sólo lo que claramente no tiene nada que ver.
- NO juzgues calidad, prestigio, duración ni antigüedad: sólo pertinencia con la búsqueda. Un puesto de dos meses o una empresa desconocida DEL RUBRO se conservan.
- NO descartes por estar en curso, sin fecha o sin descripción.
- Usá las claves TAL CUAL vienen entre corchetes. No inventes claves ni descartes ítems que no estén en la lista.

FORMATO DE SALIDA: respondé ÚNICAMENTE con un objeto JSON válido (sin markdown, sin texto extra):
{
  "descartar": [
    {
      "clave": "string — la clave EXACTA del ítem, tal cual viene entre corchetes",
      "motivo": "string — 5 a 12 palabras, en 3ª persona, explicando por qué no aporta a esta búsqueda"
    }
  ]
}
Si todo el material aporta, devolvé {"descartar": []}.`

  const formStr = ctx.formaciones.length
    ? ctx.formaciones
        .map(f => `  - [${f.id}] ${f.titulo} — ${f.institucion}`)
        .join('\n')
    : '  (sin formación cargada)'

  const cursosStr = ctx.cursos.length
    ? ctx.cursos.map(c => `  - [${c.id}] ${c.nombre} — ${c.institucion}`).join('\n')
    : '  (sin cursos cargados)'

  const expStr = ctx.experiencias.length
    ? ctx.experiencias
        .map(e => {
          const desc = e.descripcion?.trim() ? ` — Tareas: ${e.descripcion.trim()}` : ''
          return `  - [${e.id}] ${e.puesto} en ${e.empresa}${desc}`
        })
        .join('\n')
    : '  (sin experiencia cargada)'

  const compStr = ctx.competenciasTecnicas.length
    ? ctx.competenciasTecnicas.map(c => `  - [${c}] ${c}`).join('\n')
    : '  (sin competencias cargadas)'

  const userPrompt = `Evaluá este perfil técnico contra la búsqueda declarada y devolvé SOLO el JSON.

BÚSQUEDA DECLARADA: ${ctx.objetivo}

═══ FORMACIÓN ═══
${formStr}

═══ CURSOS Y CAPACITACIONES ═══
${cursosStr}

═══ EXPERIENCIA LABORAL ═══
${expStr}

═══ COMPETENCIAS (habilidades y tecnologías) ═══
${compStr}`

  return { systemPrompt, userPrompt }
}

/** Paso 2: la prosa del certificado, ya con el material técnico filtrado. */
export function buildSintesisPrompts(ctx: SintesisPromptContext): {
  systemPrompt: string
  userPrompt: string
} {
  const nombre = primerNombre(ctx.nombre)
  const hoy = indiceHoy()

  const systemPrompt = `Sos un consultor de talento. Redactás en español rioplatense, en TERCERA PERSONA (ej: "${nombre} combina...", "Su experiencia..."). Prohibido "tú" y "vos".

Tu tarea: escribir un PERFIL PROFESIONAL INTEGRADO para un certificado que un reclutador lee ANTES de entrevistar al candidato. Debe permitirle entender cómo es esta persona en el ámbito laboral: qué hizo y cómo lo hace.

LA BÚSQUEDA DECLARADA ES EL EJE:
El candidato declaró qué estudió y qué busca. Todo lo que escribas tiene que servirle a un reclutador que lo evalúa PARA ESA BÚSQUEDA. El material técnico que recibís YA fue filtrado: lo que no aportaba se sacó antes de llegar a vos. Escribí sobre lo que está, no menciones ausencias ("no registra experiencia en...") ni te disculpes por lo que falta.

QUÉ ESCRIBÍS:
Un único párrafo, que se imprime tal cual en el certificado bajo el título "Síntesis de personalidad".
Ese párrafo es una síntesis de PERSONALIDAD, no un curriculum: cómo piensa, cómo decide, cómo se mueve en un equipo, qué lo motiva. El certificado ya lista APARTE su formación, su experiencia con fechas, sus competencias y sus idiomas: repetir esos datos acá desperdicia el único párrafo que el reclutador lee primero.
PROHIBIDO EN ESE PÁRRAFO: fechas, años, duraciones, antigüedad, nombres de empresas, nombres de instituciones y nombres de títulos académicos. Podés nombrar su campo en términos generales ("en el desarrollo de software"), nada más.
Tiene que ser concreto y revelador, y dejar al lector con ganas de saber más. Nada de fórmulas genéricas que le sirvan a cualquiera.

LA REGLA CENTRAL — DESTILAR, NO LISTAR:
El candidato ya tiene un informe de personalidad completo detrás del QR. NO lo resumas sección por sección ni enumeres rasgos sueltos: elegí los dos o tres que más lo definen y contalos como se ven EN ACCIÓN dentro de su campo.
- MAL (lista): "Es analítico, detallista, autónomo y orientado a resultados."
- MAL (dato duro): "Con 2 años y 3 meses como desarrollador en Acme, su perfil se orienta al liderazgo."
- BIEN (destila): "Necesita entender el porqué antes de escribir la primera línea, y esa insistencia en el fundamento es la que lo vuelve confiable cuando el problema no tiene manual: sostiene la precisión aun cuando el pedido cambia de semana a semana."

PROHIBIDO:
- Inventar experiencia, títulos, empresas, tecnologías o competencias que no estén en los datos provistos.
- Recalcular o mencionar niveles, puntajes, porcentajes, barras o rankings del informe.
- Deducir por tu cuenta si una formación o un curso terminó: cada ítem viene etiquetado [TÍTULO OBTENIDO], [FINALIZADO] o [EN CURSO]. Respetá la etiqueta al pie de la letra. Escribir "actualmente cursa" sobre un [TÍTULO OBTENIDO] es un error grave.
- Adular, exagerar o usar relleno de consultoría ("es un profesional excepcional", "aporta un gran valor").
- Copiar textual las frases del informe: reformulalas SIEMPRE con tus propias palabras.

SI FALTAN DATOS: el material técnico está ahí para que sepas en qué campo se mueve y puedas hacer concreto el retrato, no para citarlo. Si hay poco, escribí igual desde su personalidad y su búsqueda declarada. Nunca rellenes con supuestos.

FORMATO DE SALIDA: respondé ÚNICAMENTE con un objeto JSON válido (sin markdown, sin texto extra) con esta forma EXACTA:
{
  "perfilIntegrado": "string — UN SOLO párrafo de 4 a 6 oraciones, sin saltos de línea. Es el texto completo que se imprime en el certificado."
}

EXTENSIÓN: entre 110 y 160 palabras. Un solo párrafo, denso y sin relleno. No agregues ninguna otra clave al JSON.${
    ctx.personalidadPublica
      ? `

CIERRE: terminá el párrafo con UNA sola oración breve, dicha al pasar, que invite a leer su informe de personalidad completo escaneando el código QR de este certificado. Sin signos de exclamación, sin tono publicitario: es un dato útil, no un aviso.`
      : ''
  }`

  const compTecStr = ctx.competenciasTecnicas.length
    ? ctx.competenciasTecnicas.map(c => `  - ${c}`).join('\n')
    : '  (sin competencias técnicas cargadas)'

  const expStr = ctx.experiencias.length
    ? ctx.experiencias
        .map(e => {
          const periodo = `${formatMes(e.fechaInicio)} — ${e.fechaFin ? formatMes(e.fechaFin) : 'Actualidad'}`
          const dur = formatDuracion(mesesEntre(e.fechaInicio, e.fechaFin))
          const vigente = e.fechaFin ? '' : ' [PUESTO ACTUAL]'
          const desc = e.descripcion?.trim() ? `\n    Tareas: ${e.descripcion.trim()}` : ''
          return `  - ${e.puesto} en ${e.empresa} · ${periodo} (${dur})${vigente}${desc}`
        })
        .join('\n')
    : '  (sin experiencia cargada)'

  const formStr = ctx.formaciones.length
    ? ctx.formaciones
        .map(f => {
          // El estado lo resuelve el código, no el modelo. Una fecha suelta
          // ('ene 2026') no dice si el título ya se obtuvo o si recién se cursa,
          // y el modelo termina inventando ("actualmente cursa" sobre un título
          // ya obtenido). Sin fecha de graduación = no concluyó; con fecha ya
          // cumplida = obtenido; con fecha futura = en curso.
          const base = `  - ${f.titulo} — ${f.institucion}`
          if (!f.fechaGraduacion) return `${base} · [EN CURSO] · sin fecha de graduación`
          const idx = indiceMes(f.fechaGraduacion)
          return Number.isFinite(idx) && idx <= hoy
            ? `${base} · [TÍTULO OBTENIDO] · graduado en ${formatMes(f.fechaGraduacion)}`
            : `${base} · [EN CURSO] · graduación prevista ${formatMes(f.fechaGraduacion)}`
        })
        .join('\n')
    : '  (sin formación cargada)'

  const cursosStr = ctx.cursos.length
    ? ctx.cursos
        .map(c => {
          const idxFin = c.fechaFin ? indiceMes(c.fechaFin) : NaN
          const estado = !c.fechaFin
            ? '[EN CURSO] · sin fecha de finalización'
            : Number.isFinite(idxFin) && idxFin <= hoy
              ? `[FINALIZADO] · ${formatMes(c.fechaFin)}`
              : `[EN CURSO] · finaliza ${formatMes(c.fechaFin)}`
          const detalle = [
            estado,
            c.duracionHoras ? `${c.duracionHoras} h` : null,
          ]
            .filter(Boolean)
            .join(' · ')
          return `  - ${c.nombre} — ${c.institucion} · ${detalle}`
        })
        .join('\n')
    : '  (sin cursos cargados)'

  const idiomasStr = ctx.idiomas.length
    ? ctx.idiomas.map(i => `  - ${i.nombre}: ${i.nivel}`).join('\n')
    : '  (sin idiomas cargados)'

  const talentosStr = ctx.talentos.length
    ? ctx.talentos.map(t => `  - ${t.nombre}: ${t.descripcion}`).join('\n')
    : '  (no especificados)'

  const destacadasStr = ctx.competenciasDestacadas.length
    ? ctx.competenciasDestacadas.map(c => `  - ${c.nombre} (${c.nivel})`).join('\n')
    : '  (no especificadas)'

  const comoTrabajaStr = ctx.comoTrabaja.length
    ? ctx.comoTrabaja.map(i => `  - ${i.titulo}: ${i.texto}`).join('\n')
    : '  (no especificado)'

  const antiguedad = antiguedadTotal(ctx.experiencias)

  const userPrompt = `Redactá el perfil integrado para el siguiente candidato y devolvé SOLO el JSON.

═══ CANDIDATO ═══
Fecha de hoy: ${formatMes(new Date().toISOString().slice(0, 7))}
Nombre: ${nombre}
Qué estudió / qué busca (EL EJE — todo lo que escribas tiene que servirle a un reclutador de esta búsqueda): ${ctx.objetivo}
${ctx.subtitulo ? `Posicionamiento: ${ctx.subtitulo}` : ''}
Antigüedad laboral relevante (YA CALCULADA sobre la experiencia de abajo — si la citás, copiala tal cual; NUNCA la cites): ${antiguedad ?? 'sin experiencia cargada'}

═══ MATERIAL DE PERSONALIDAD ═══
Es el "cómo". NO lo copies ni lo resumas: usalo para explicar la trayectoria de abajo.

Síntesis de personalidad:
${ctx.descripcionPersonalidad}

Talentos destacados:
${talentosStr}

Competencias de personalidad más marcadas (contexto de fondo — NO las listes ni menciones sus niveles):
${destacadasStr}

Cómo trabaja (está en 2ª persona: pasalo a 3ª y anclalo en su experiencia real; NO lo transcribas):
${comoTrabajaStr}

═══ MATERIAL TÉCNICO ═══
Es el "qué". Toda afirmación sobre su personalidad tiene que apoyarse en algo de acá.
Ya está filtrado por relevancia para la búsqueda declarada: esto es TODO lo que hay que contar.

Formación académica:
${formStr}

Cursos y capacitaciones (complementan la formación; las horas ya vienen calculadas):
${cursosStr}

Experiencia laboral (duraciones YA CALCULADAS — citalas tal cual):
${expStr}

Competencias técnicas (integrá por nombre EXACTO las que encajen; no fuerces las que no):
${compTecStr}

Idiomas:
${idiomasStr}`

  return { systemPrompt, userPrompt }
}
