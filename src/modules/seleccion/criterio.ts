/**
 * Criterio común del asistente 1-a-1 (`asistente/prompts.ts`) y del informe de
 * selección grupal (`seleccion/prompts.ts`).
 *
 * Los dos prompts importan estas constantes: si el criterio cambia, cambia para
 * ambos. Antes cada prompt tenía su propia versión y un mismo candidato podía
 * salir "Alta" en el chat y "Baja" en el PDF.
 */

/** Qué prueba cada fuente: experiencia declarada vs. preferencias del Eneagrama. */
export const LECTURA_FUENTES = `CÓMO LEER LAS FUENTES:
- El PERFIL TÉCNICO (experiencia laboral, formación académica y competencias cargadas) es lo único que indica lo que la persona hizo o sabe hacer. Es información declarada por el candidato.
- Las competencias del motor ("Comercial / ventas relacionales", "Orientación a resultados", "Organización y planificación", etc.) y la narrativa del informe de personalidad describen preferencias y estilos naturales de trabajo según el Eneagrama. NO miden conocimientos, habilidades ni experiencia. Nunca las presentes como algo que la persona "posee" o "tiene": expresalas como tendencia ("tiende a", "le resulta natural").
- Una competencia del motor nunca alcanza, por sí sola, para justificar compatibilidad Alta.
- Antes de afirmar que a un candidato le falta una competencia, formación o experiencia, revisá todas las listas de su PERFIL TÉCNICO.`

/** Cómo usar el bloque del motor y los informes de formato anterior o desactualizados. */
export const REGLAS_MOTOR = `DATOS DEL MOTOR DE COMPETENCIAS:
- El eneatipo dominante, el orden de las 13 competencias, las fortalezas y los focos de desarrollo salen de los resultados del Eneagrama y se calculan con el mismo criterio para todos los candidatos. El orden es relativo a cada persona, no un puntaje absoluto.
- Los focos de desarrollo son las competencias de menor afinidad natural. Si alguno coincide con una tarea central del puesto, es un riesgo a señalar.
- Los candidatos cuyo informe de personalidad figura en un formato anterior, o cuya narrativa falta o está desactualizada, tienen igualmente los datos del motor: evalualos sobre esos datos con el mismo peso que a cualquier otro. Que tengan menos detalle narrativo NO debe penalizarlos ni mencionarse como información faltante. Indicá información faltante de personalidad solo cuando el bloque diga "No disponible".`

/** Definición única de Alta / Media / Baja. */
export const RUBRICA_COMPATIBILIDAD = `COMPATIBILIDAD (Alta / Media / Baja):
Mide el ajuste del candidato frente a los requisitos de ESTE puesto, no frente a otros candidatos.
- Alta: tiene experiencia laboral declarada directa en las funciones centrales y en el rubro del puesto, competencias afines, y ningún foco de desarrollo que comprometa una tarea central.
- Media: tiene experiencia transferible o formación útil (por ejemplo atención al público, caja o tareas administrativas fuera del rubro), pero poca o ninguna experiencia directa en el rubro o en las funciones principales del puesto, o presenta focos de desarrollo en áreas relevantes que requerirían seguimiento.
- Baja: no tiene experiencia ni formación vinculadas a las funciones del puesto, o su perfil y sus focos de desarrollo se contraponen con requisitos esenciales.
- Si el nivel requerido indica un puesto inicial, trainee o sin experiencia, no exijas experiencia previa en el rubro para Alta: evaluá formación, competencias cargadas y ajuste de estilo.
- Tener etiquetas cargadas en "Competencias" no reemplaza la experiencia: si la experiencia laboral fue en otro rol o rubro, el máximo es Media.`
