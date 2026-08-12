import 'server-only'
import { aiProvider } from '@/lib/ai'
import {
  buildTriagePrompts,
  buildSintesisPrompts,
  type SintesisPromptContext,
  type SintesisFormacion,
  type SintesisCurso,
  type SintesisExperiencia,
} from './sintesis-prompt'
import {
  SINTESIS_VERSION,
  type CertificadoSintesisJSON,
  type SintesisFortaleza,
  type SintesisDescarte,
} from '@/lib/types/certificado'

export type SintesisContext = SintesisPromptContext

export type SintesisResult =
  | { ok: true; sintesis: CertificadoSintesisJSON; tokens: { input: number; output: number }; modelo: string }
  | { ok: false; motivo: string }

function extractJSON(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenceMatch) return fenceMatch[1].trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) return raw.slice(start, end + 1)
  return raw.trim()
}

function norm(s: string): string {
  return s.trim().toLowerCase()
}

/** Texto no vacío, o null. */
function str(x: unknown): string | null {
  return typeof x === 'string' && x.trim().length > 0 ? x.trim() : null
}

/**
 * Fortalezas válidas: descartamos las entradas incompletas en vez de rechazar
 * toda la síntesis — el perfil en prosa sigue siendo utilizable sin ellas.
 */
function parseFortalezas(x: unknown): SintesisFortaleza[] {
  if (!Array.isArray(x)) return []
  return x.flatMap(item => {
    const f = item as { titulo?: unknown; texto?: unknown }
    const titulo = str(f?.titulo)
    const texto = str(f?.texto)
    return titulo && texto ? [{ titulo, texto }] : []
  })
}

/**
 * Triage: qué material técnico no aporta a la búsqueda declarada, para que la
 * redacción no lo mencione y el sistema no lo muestre en el certificado.
 *
 * Es un paso "best effort": si el proveedor falla o devuelve basura, NO
 * bloqueamos la síntesis — seguimos con todo el material intacto (fail open).
 * Perder el filtro de relevancia es aceptable; perder la síntesis entera no.
 */
async function triageMaterialTecnico(ctx: {
  objetivo: string
  competenciasTecnicas: string[]
  formaciones: SintesisFormacion[]
  cursos: SintesisCurso[]
  experiencias: SintesisExperiencia[]
}): Promise<SintesisDescarte[]> {
  const hayMaterial =
    ctx.competenciasTecnicas.length > 0 ||
    ctx.formaciones.length > 0 ||
    ctx.cursos.length > 0 ||
    ctx.experiencias.length > 0
  if (!hayMaterial) return []

  const { systemPrompt, userPrompt } = buildTriagePrompts(ctx)

  let raw: string
  try {
    const result = await aiProvider.generate({
      systemPrompt,
      userPrompt,
      responseFormat: 'json',
      maxTokens: 800,
      temperature: 0.3,
    })
    raw = result.content
  } catch (err) {
    console.error('[certificado/sintesis] Triage: error del proveedor, se conserva todo el material:', err)
    return []
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(extractJSON(raw))
  } catch {
    console.error('[certificado/sintesis] Triage: respuesta no es JSON válido, se conserva todo el material.')
    return []
  }

  const descartar = (parsed as { descartar?: unknown })?.descartar
  if (!Array.isArray(descartar)) return []

  const formMap = new Map(ctx.formaciones.map(f => [f.id, `${f.titulo} — ${f.institucion}`]))
  const cursoMap = new Map(ctx.cursos.map(c => [c.id, `${c.nombre} — ${c.institucion}`]))
  const expMap = new Map(ctx.experiencias.map(e => [e.id, `${e.puesto} en ${e.empresa}`]))
  const compMap = new Map(ctx.competenciasTecnicas.map(c => [norm(c), c]))

  const descartados: SintesisDescarte[] = []
  for (const item of descartar) {
    const clave = str((item as { clave?: unknown })?.clave)
    const motivo = str((item as { motivo?: unknown })?.motivo) ?? 'No se relaciona con la búsqueda declarada.'
    if (!clave) continue

    if (formMap.has(clave)) {
      descartados.push({ clave, tipo: 'formacion', label: formMap.get(clave)!, motivo })
    } else if (cursoMap.has(clave)) {
      descartados.push({ clave, tipo: 'curso', label: cursoMap.get(clave)!, motivo })
    } else if (expMap.has(clave)) {
      descartados.push({ clave, tipo: 'experiencia', label: expMap.get(clave)!, motivo })
    } else if (compMap.has(norm(clave))) {
      const nombreExacto = compMap.get(norm(clave))!
      descartados.push({ clave: nombreExacto, tipo: 'competencia', label: nombreExacto, motivo })
    }
    // Clave alucinada (no matchea ningún ítem real): se ignora.
  }

  // Válvula de seguridad: si el triage vació una categoría con material Y dejaría
  // el perfil técnico entero sin nada, es más probable que el modelo se haya
  // excedido que que TODO el perfil sea irrelevante. Se ignora el triage entero.
  const totalOriginal =
    ctx.competenciasTecnicas.length + ctx.formaciones.length + ctx.cursos.length + ctx.experiencias.length
  const totalDescartado = descartados.length
  if (totalOriginal > 0 && totalDescartado >= totalOriginal) {
    console.warn('[certificado/sintesis] Triage habría vaciado todo el perfil técnico; se ignora y se conserva todo.')
    return []
  }

  return descartados
}

/**
 * Genera la síntesis integrada del certificado en dos pasos (triage + redacción).
 * No escribe en la DB (responsabilidad del caller).
 *
 * Garantía anti-pérdida: filtramos `competenciasIntegradas` para quedarnos SOLO
 * con nombres que existen de verdad en las competencias técnicas provistas (por
 * si el LLM alucina). El caller calcula las NO integradas = provistas − estas
 * (usando `competenciasNoIntegradas` y descontando además las descartadas).
 */
export async function generarSintesisCertificado(ctx: SintesisContext): Promise<SintesisResult> {
  const descartados = await triageMaterialTecnico({
    objetivo: ctx.objetivo,
    competenciasTecnicas: ctx.competenciasTecnicas,
    formaciones: ctx.formaciones,
    cursos: ctx.cursos,
    experiencias: ctx.experiencias,
  })

  const formaciones = ctx.formaciones.filter(f => !descartados.some(d => d.tipo === 'formacion' && d.clave === f.id))
  const cursos = ctx.cursos.filter(c => !descartados.some(d => d.tipo === 'curso' && d.clave === c.id))
  const experiencias = ctx.experiencias.filter(e => !descartados.some(d => d.tipo === 'experiencia' && d.clave === e.id))
  const competenciasDescartadasSet = new Set(
    descartados.filter(d => d.tipo === 'competencia').map(d => norm(d.clave)),
  )
  const competenciasTecnicas = ctx.competenciasTecnicas.filter(c => !competenciasDescartadasSet.has(norm(c)))

  const ctxFiltrado: SintesisContext = { ...ctx, formaciones, cursos, experiencias, competenciasTecnicas }

  const { systemPrompt, userPrompt } = buildSintesisPrompts(ctxFiltrado)

  let result
  try {
    result = await aiProvider.generate({
      systemPrompt,
      userPrompt,
      responseFormat: 'json',
      // ~750 palabras de prosa + JSON de envoltura; el resto es margen para que
      // el modelo no corte la respuesta a la mitad (JSON truncado = parseo roto).
      maxTokens: 2600,
      temperature: 0.6,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido del proveedor de IA.'
    console.error('[certificado/sintesis] Error al llamar al proveedor:', msg)
    return { ok: false, motivo: msg }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(extractJSON(result.content))
  } catch {
    console.error('[certificado/sintesis] Respuesta no es JSON válido:', result.content.slice(0, 300))
    return { ok: false, motivo: 'El modelo no respondió con JSON válido. Intentá de nuevo.' }
  }

  const p = parsed as {
    perfilIntegrado?: unknown
    fortalezas?: unknown
    contextoIdeal?: unknown
    competenciasIntegradas?: unknown
  }
  const perfilIntegrado = str(p.perfilIntegrado)
  if (!perfilIntegrado) {
    return { ok: false, motivo: 'El modelo no devolvió el perfil integrado. Intentá de nuevo.' }
  }

  // Solo aceptamos nombres de competencias que existen realmente en el input YA FILTRADO.
  const catalogo = new Map(competenciasTecnicas.map(c => [norm(c), c]))
  const integradas = Array.isArray(p.competenciasIntegradas)
    ? Array.from(
        new Set(
          p.competenciasIntegradas
            .filter((x): x is string => typeof x === 'string')
            .map(x => catalogo.get(norm(x)))
            .filter((x): x is string => x !== undefined),
        ),
      )
    : []

  const fortalezas = parseFortalezas(p.fortalezas)
  const contextoIdeal = str(p.contextoIdeal)

  const sintesis: CertificadoSintesisJSON = {
    perfilIntegrado,
    ...(fortalezas.length > 0 && { fortalezas }),
    ...(contextoIdeal && { contextoIdeal }),
    competenciasIntegradas: integradas,
    objetivo: ctx.objetivo,
    ...(descartados.length > 0 && { descartados }),
    generadaAt: new Date().toISOString(),
    version: SINTESIS_VERSION,
  }

  console.info(
    `[certificado/sintesis] Generada con ${result.model}. ` +
      `Tokens: ${result.usage.inputTokens} in + ${result.usage.outputTokens} out. ` +
      `Fortalezas: ${fortalezas.length}. Competencias integradas: ${integradas.length}/${competenciasTecnicas.length}. ` +
      `Descartados por triage: ${descartados.length}.`,
  )

  return {
    ok: true,
    sintesis,
    tokens: { input: result.usage.inputTokens, output: result.usage.outputTokens },
    modelo: result.model,
  }
}

/** Competencias técnicas provistas que el LLM NO integró en la prosa (van al final, textuales). */
export function competenciasNoIntegradas(todas: string[], integradas: string[]): string[] {
  const set = new Set(integradas.map(norm))
  return todas.filter(c => !set.has(norm(c)))
}
