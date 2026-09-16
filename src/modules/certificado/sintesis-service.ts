import 'server-only'
import { aiProvider, type GenerateResult } from '@/lib/ai'
import { esperar, interpretarFallo } from '@/lib/ai/errores'
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
  type SintesisDescarte,
} from '@/lib/types/certificado'

export type SintesisContext = SintesisPromptContext

export type SintesisResult =
  | { ok: true; sintesis: CertificadoSintesisJSON; tokens: { input: number; output: number }; modelo: string }
  | { ok: false; motivo: string }

/**
 * Intentos por llamada al proveedor. Cubre tanto el fallo transitorio (un 503
 * es un pico de demanda que se pasa) como la respuesta defectuosa del modelo.
 */
const INTENTOS = 2

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

  // Un 503 acá no debería costarle el filtro al certificado: se reintenta. Pero
  // si el proveedor no afloja, el fail open sigue mandando — quedarse sin filtro
  // muestra un ítem de más; quedarse sin síntesis no deja emitir el documento.
  let raw: string | null = null
  for (let intento = 1; intento <= INTENTOS; intento++) {
    try {
      const result = await aiProvider.generate({
        systemPrompt,
        userPrompt,
        responseFormat: 'json',
        maxTokens: 800,
        temperature: 0.3,
      })
      raw = result.content
      break
    } catch (err) {
      const fallo = interpretarFallo(err)
      console.error(
        `[certificado/sintesis] Triage intento ${intento}/${INTENTOS} — proveedor (${fallo.kind}):`,
        fallo.crudo,
      )
      if (fallo.transitorio && intento < INTENTOS) {
        await esperar()
        continue
      }
      console.error('[certificado/sintesis] Triage: se conserva todo el material.')
      return []
    }
  }
  if (raw === null) return []

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
 * De la respuesta del modelo se toma UNA sola cosa: el párrafo. Las competencias
 * técnicas, la formación y los idiomas los lista el certificado por su propio
 * camino (`pdf-props`), leyendo el perfil vigente — el párrafo no las enumera y
 * el modelo no informa cuáles usó. Cualquier clave extra que devuelva se ignora.
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

  // El prompt pide UNA sola clave. Lo que el modelo agregue de más se ignora.
  type SintesisCruda = { perfilIntegrado?: unknown }

  let ultimoMotivo = 'El servicio de IA no devolvió una síntesis utilizable.'
  let exito: { result: GenerateResult; p: SintesisCruda; perfilIntegrado: string } | null = null

  for (let intento = 1; intento <= INTENTOS; intento++) {
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
      // Lo transitorio se reintenta; la credencial ausente o el truncado no.
      const fallo = interpretarFallo(err)
      ultimoMotivo = fallo.motivo
      console.error(
        `[certificado/sintesis] Intento ${intento}/${INTENTOS} — proveedor (${fallo.kind}):`,
        fallo.crudo,
      )
      if (fallo.transitorio && intento < INTENTOS) {
        await esperar()
        continue
      }
      return { ok: false, motivo: fallo.motivo }
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(extractJSON(result.content))
    } catch {
      ultimoMotivo = 'El servicio de IA devolvió una respuesta inválida.'
      console.error(
        `[certificado/sintesis] Intento ${intento}/${INTENTOS} — JSON inválido:`,
        result.content.slice(0, 300),
      )
      continue
    }

    const p = parsed as SintesisCruda
    const perfilIntegrado = str(p.perfilIntegrado)
    if (!perfilIntegrado) {
      ultimoMotivo = 'El servicio de IA no devolvió el perfil integrado.'
      console.error(`[certificado/sintesis] Intento ${intento}/${INTENTOS} — sin perfilIntegrado.`)
      continue
    }

    exito = { result, p, perfilIntegrado }
    break
  }

  if (!exito) return { ok: false, motivo: `${ultimoMotivo} Intentá de nuevo.` }

  const { result, perfilIntegrado } = exito

  const sintesis: CertificadoSintesisJSON = {
    perfilIntegrado,
    objetivo: ctx.objetivo,
    ...(descartados.length > 0 && { descartados }),
    generadaAt: new Date().toISOString(),
    version: SINTESIS_VERSION,
  }

  console.info(
    `[certificado/sintesis] Generada con ${result.model}. ` +
      `Tokens: ${result.usage.inputTokens} in + ${result.usage.outputTokens} out. ` +
      `Palabras del párrafo: ${perfilIntegrado.split(/\s+/).length}. ` +
      `Descartados por triage: ${descartados.length}.`,
  )

  return {
    ok: true,
    sintesis,
    tokens: { input: result.usage.inputTokens, output: result.usage.outputTokens },
    modelo: result.model,
  }
}
