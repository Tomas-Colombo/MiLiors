'use server'

import { createClient } from '@/lib/supabase/server'
import { getPostulanteId } from '@/modules/perfil/queries'
import { formacionSchema, experienciaSchema, idiomaSchema, cursoSchema } from './schema'
import type { ActionResult } from '@/lib/types/domain'
import { NIVEL_COMPETENCIA, type NivelCompetencia } from '@/lib/constants/enums'
import { normalizarTexto } from '@/lib/texto'
import { crearSchemaNombreCatalogo } from '@/modules/admin/schema'
import { marcarCambioPerfilTecnico } from './certificado'

// Converts YYYY-MM → YYYY-MM-01 for Postgres DATE columns
function toDate(mesAnio: string | undefined): string | null {
  if (!mesAnio) return null
  return `${mesAnio}-01`
}

// Helper: get or create perfil_tecnico
async function getOrCreatePerfilTecnico(postulanteId: string): Promise<string | null> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from('perfil_tecnico')
    .select('id')
    .eq('postulante_id', postulanteId)
    .maybeSingle()

  if (existing) return (existing as { id: string }).id

  const { data: created, error } = await supabase
    .from('perfil_tecnico')
    .insert({ postulante_id: postulanteId })
    .select('id')
    .single()

  if (error || !created) return null

  return (created as { id: string }).id
}

// ─── FORMACIÓN ────────────────────────────────────────────────────────────────

function resolveInstitucion(formData: FormData): string | null {
  const institucion = formData.get('institucion') as string | null
  if (institucion === 'Otra') {
    const personalizada = (formData.get('institucion_personalizada') as string | null)?.trim()
    return personalizada || null
  }
  return institucion
}

/**
 * El título llega del catálogo de carreras como texto, salvo que la persona
 * haya elegido el escape `__OTRO__`, y entonces vale el campo libre.
 */
function resolveTitulo(formData: FormData): string | null {
  const titulo = formData.get('titulo') as string | null
  if (titulo === '__OTRO__') {
    const personalizado = (formData.get('titulo_personalizado') as string | null)?.trim()
    return personalizado || null
  }
  return titulo
}

export async function agregarFormacion(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = formacionSchema.safeParse({
    institucion: resolveInstitucion(formData),
    titulo: resolveTitulo(formData),
    fecha_graduacion: formData.get('fecha_graduacion') || undefined,
  })
  if (!parsed.success) {
    return { success: false, error: 'Revisá los campos.', fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const postulanteId = await getPostulanteId()
  if (!postulanteId) return { success: false, error: 'Perfil no encontrado.' }

  const perfilTecnicoId = await getOrCreatePerfilTecnico(postulanteId)
  if (!perfilTecnicoId) return { success: false, error: 'No se pudo preparar el perfil técnico.' }

  const supabase = await createClient()

  const { error } = await supabase.from('formacion_academica').insert({
    perfil_tecnico_id: perfilTecnicoId,
    institucion: parsed.data.institucion,
    titulo: parsed.data.titulo,
    fecha_graduacion: toDate(parsed.data.fecha_graduacion),
  })

  if (error) return { success: false, error: 'No se pudo guardar la formación.' }
  await marcarCambioPerfilTecnico(postulanteId)
  return { success: true, data: undefined }
}

export async function editarFormacion(
  id: string,
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = formacionSchema.safeParse({
    institucion: resolveInstitucion(formData),
    titulo: resolveTitulo(formData),
    fecha_graduacion: formData.get('fecha_graduacion') || undefined,
  })
  if (!parsed.success) {
    return { success: false, error: 'Revisá los campos.', fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const postulanteId = await getPostulanteId()
  if (!postulanteId) return { success: false, error: 'Perfil no encontrado.' }

  const supabase = await createClient()
  const { error } = await supabase.from('formacion_academica')
    .update({
      institucion: parsed.data.institucion,
      titulo: parsed.data.titulo,
      fecha_graduacion: toDate(parsed.data.fecha_graduacion),
    })
    .eq('id', id)

  if (error) return { success: false, error: 'No se pudo actualizar la formación.' }
  await marcarCambioPerfilTecnico(postulanteId)
  return { success: true, data: undefined }
}

export async function eliminarFormacion(id: string): Promise<ActionResult> {
  const postulanteId = await getPostulanteId()
  const supabase = await createClient()
  const { error } = await supabase.from('formacion_academica').delete().eq('id', id)
  if (error) return { success: false, error: 'No se pudo eliminar.' }
  await marcarCambioPerfilTecnico(postulanteId)
  return { success: true, data: undefined }
}

// ─── CURSOS ───────────────────────────────────────────────────────────────────

// Los opcionales llegan como '' cuando el campo quedó vacío: se normalizan a
// undefined para que el schema no intente validarlos (z.coerce.number('') = 0).
function parseCurso(formData: FormData) {
  return cursoSchema.safeParse({
    nombre: formData.get('nombre'),
    institucion: formData.get('institucion'),
    fecha_fin: formData.get('fecha_fin') || undefined,
    duracion_horas: formData.get('duracion_horas') || undefined,
    url_credencial: formData.get('url_credencial') || undefined,
  })
}

export async function agregarCurso(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = parseCurso(formData)
  if (!parsed.success) {
    return { success: false, error: 'Revisá los campos.', fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const postulanteId = await getPostulanteId()
  if (!postulanteId) return { success: false, error: 'Perfil no encontrado.' }

  const perfilTecnicoId = await getOrCreatePerfilTecnico(postulanteId)
  if (!perfilTecnicoId) return { success: false, error: 'No se pudo preparar el perfil técnico.' }

  const supabase = await createClient()

  const { error } = await supabase.from('curso').insert({
    perfil_tecnico_id: perfilTecnicoId,
    nombre: parsed.data.nombre,
    institucion: parsed.data.institucion,
    fecha_fin: toDate(parsed.data.fecha_fin),
    duracion_horas: parsed.data.duracion_horas ?? null,
    url_credencial: parsed.data.url_credencial || null,
  })

  if (error) return { success: false, error: 'No se pudo guardar el curso.' }
  await marcarCambioPerfilTecnico(postulanteId)
  return { success: true, data: undefined }
}

export async function editarCurso(
  id: string,
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = parseCurso(formData)
  if (!parsed.success) {
    return { success: false, error: 'Revisá los campos.', fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const postulanteId = await getPostulanteId()
  const supabase = await createClient()
  const { error } = await supabase.from('curso')
    .update({
      nombre: parsed.data.nombre,
      institucion: parsed.data.institucion,
      fecha_fin: toDate(parsed.data.fecha_fin),
      duracion_horas: parsed.data.duracion_horas ?? null,
      url_credencial: parsed.data.url_credencial || null,
    })
    .eq('id', id)

  if (error) return { success: false, error: 'No se pudo actualizar el curso.' }
  await marcarCambioPerfilTecnico(postulanteId)
  return { success: true, data: undefined }
}

export async function eliminarCurso(id: string): Promise<ActionResult> {
  const postulanteId = await getPostulanteId()
  const supabase = await createClient()
  const { error } = await supabase.from('curso').delete().eq('id', id)
  if (error) return { success: false, error: 'No se pudo eliminar.' }
  await marcarCambioPerfilTecnico(postulanteId)
  return { success: true, data: undefined }
}

// ─── EXPERIENCIA ──────────────────────────────────────────────────────────────

export async function agregarExperiencia(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = experienciaSchema.safeParse({
    empresa: formData.get('empresa'),
    puesto: formData.get('puesto'),
    fecha_inicio: formData.get('fecha_inicio'),
    fecha_fin: formData.get('fecha_fin') || undefined,
    descripcion: formData.get('descripcion') || undefined,
  })
  if (!parsed.success) {
    return { success: false, error: 'Revisá los campos.', fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const postulanteId = await getPostulanteId()
  if (!postulanteId) return { success: false, error: 'Perfil no encontrado.' }

  const perfilTecnicoId = await getOrCreatePerfilTecnico(postulanteId)
  if (!perfilTecnicoId) return { success: false, error: 'No se pudo preparar el perfil técnico.' }

  const supabase = await createClient()

  const { error } = await supabase.from('experiencia_laboral').insert({
    perfil_tecnico_id: perfilTecnicoId,
    empresa: parsed.data.empresa,
    puesto: parsed.data.puesto,
    fecha_inicio: toDate(parsed.data.fecha_inicio)!,
    fecha_fin: toDate(parsed.data.fecha_fin),
    descripcion: parsed.data.descripcion || null,
  })

  if (error) return { success: false, error: 'No se pudo guardar la experiencia.' }
  await marcarCambioPerfilTecnico(postulanteId)
  return { success: true, data: undefined }
}

export async function editarExperiencia(
  id: string,
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = experienciaSchema.safeParse({
    empresa: formData.get('empresa'),
    puesto: formData.get('puesto'),
    fecha_inicio: formData.get('fecha_inicio'),
    fecha_fin: formData.get('fecha_fin') || undefined,
    descripcion: formData.get('descripcion') || undefined,
  })
  if (!parsed.success) {
    return { success: false, error: 'Revisá los campos.', fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const postulanteId = await getPostulanteId()
  const supabase = await createClient()
  const { error } = await supabase.from('experiencia_laboral')
    .update({
      empresa: parsed.data.empresa,
      puesto: parsed.data.puesto,
      fecha_inicio: toDate(parsed.data.fecha_inicio)!,
      fecha_fin: toDate(parsed.data.fecha_fin),
      descripcion: parsed.data.descripcion || null,
    })
    .eq('id', id)

  if (error) return { success: false, error: 'No se pudo actualizar.' }
  await marcarCambioPerfilTecnico(postulanteId)
  return { success: true, data: undefined }
}

export async function eliminarExperiencia(id: string): Promise<ActionResult> {
  const postulanteId = await getPostulanteId()
  const supabase = await createClient()
  const { error } = await supabase.from('experiencia_laboral').delete().eq('id', id)
  if (error) return { success: false, error: 'No se pudo eliminar.' }
  await marcarCambioPerfilTecnico(postulanteId)
  return { success: true, data: undefined }
}

// ─── IDIOMA ───────────────────────────────────────────────────────────────────

export async function agregarIdioma(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const nombreRaw = formData.get('nombre') as string | null
  const nombre = nombreRaw === 'Otro'
    ? ((formData.get('nombre_personalizado') as string | null)?.trim() || null)
    : nombreRaw
  const parsed = idiomaSchema.safeParse({
    nombre,
    nivel_idioma: formData.get('nivel_idioma'),
  })
  if (!parsed.success) {
    return { success: false, error: 'Revisá los campos.', fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const postulanteId = await getPostulanteId()
  if (!postulanteId) return { success: false, error: 'Perfil no encontrado.' }

  const perfilTecnicoId = await getOrCreatePerfilTecnico(postulanteId)
  if (!perfilTecnicoId) return { success: false, error: 'No se pudo preparar el perfil técnico.' }

  const supabase = await createClient()

  const { error } = await supabase.from('idioma').insert({
    perfil_tecnico_id: perfilTecnicoId,
    nombre: parsed.data.nombre,
    nivel_idioma: parsed.data.nivel_idioma,
  })

  if (error) return { success: false, error: 'No se pudo guardar el idioma.' }
  await marcarCambioPerfilTecnico(postulanteId)
  return { success: true, data: undefined }
}

export async function eliminarIdioma(id: string): Promise<ActionResult> {
  const postulanteId = await getPostulanteId()
  const supabase = await createClient()
  const { error } = await supabase.from('idioma').delete().eq('id', id)
  if (error) return { success: false, error: 'No se pudo eliminar.' }
  await marcarCambioPerfilTecnico(postulanteId)
  return { success: true, data: undefined }
}

// ─── COMPETENCIAS (full set) ──────────────────────────────────────────────────

export async function guardarCompetencias(competenciaIds: string[]): Promise<ActionResult> {
  const postulanteId = await getPostulanteId()
  if (!postulanteId) return { success: false, error: 'Perfil no encontrado.' }

  const perfilTecnicoId = await getOrCreatePerfilTecnico(postulanteId)
  if (!perfilTecnicoId) return { success: false, error: 'No se pudo preparar el perfil técnico.' }

  const supabase = await createClient()

  // Delete all current competencies
  const { error: deleteError } = await supabase.from('postulante_competencia')
    .delete()
    .eq('perfil_tecnico_id', perfilTecnicoId)

  if (deleteError) {
    return { success: false, error: 'No se pudieron guardar las competencias.' }
  }

  if (competenciaIds.length === 0) {
    await marcarCambioPerfilTecnico(postulanteId)
    return { success: true, data: undefined }
  }

  // Re-insert the selected ones
  const rows = competenciaIds.map((cid) => ({
    perfil_tecnico_id: perfilTecnicoId,
    competencia_id: cid,
  }))

  const { error } = await supabase.from('postulante_competencia').insert(rows)
  if (error) return { success: false, error: 'No se pudieron guardar las competencias.' }

  await marcarCambioPerfilTecnico(postulanteId)
  return { success: true, data: undefined }
}

export type CompetenciaExistenteInput = { id: string; nivel: NivelCompetencia }
export type CompetenciaCustomInput = { nombre: string; nivel: NivelCompetencia }

export type CompetenciaGuardadaItem = {
  id: string
  nombre: string
  nivel: NivelCompetencia
  pendiente?: boolean
}

/**
 * Guarda competencias para el postulante actual.
 * `existentes` — items del catálogo, con su nivel.
 * `customs` — nombres libres: si coinciden con una activa van al catálogo; si no, van a `competencia_sugerida`.
 * Retorna la lista de items guardados (incluyendo sugerencias con pendiente: true).
 */
export async function guardarCompetenciasConCustom(
  existentes: CompetenciaExistenteInput[],
  customs: CompetenciaCustomInput[]
): Promise<ActionResult & { items?: CompetenciaGuardadaItem[] }> {
  if (existentes.length + customs.length > 15) {
    return { success: false, error: 'Podés seleccionar hasta 15 competencias.' }
  }

  const schemaNombre = crearSchemaNombreCatalogo('Ingresá un nombre de competencia.')
  for (const c of customs) {
    const parsed = schemaNombre.safeParse(c.nombre)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }
  }

  const postulanteId = await getPostulanteId()
  if (!postulanteId) return { success: false, error: 'Perfil no encontrado.' }

  const perfilTecnicoId = await getOrCreatePerfilTecnico(postulanteId)
  if (!perfilTecnicoId) return { success: false, error: 'No se pudo preparar el perfil técnico.' }

  const supabase = await createClient()

  // 1. Leer catálogo activo con el cliente del usuario
  const { data: catalogoActivo, error: catError } = await supabase
    .from('competencia')
    .select('id, nombre')
    .is('fecha_baja', null)

  if (catError) {
    return { success: false, error: 'No se pudieron guardar las competencias.' }
  }

  const catalogoMap = new Map<string, { id: string; nombre: string }>()
  for (const cat of catalogoActivo ?? []) {
    catalogoMap.set(normalizarTexto(cat.nombre), cat)
  }

  // 2. Resolver items del catálogo (existentes + customs que coinciden con activas)
  const competenciasCatalogo = new Map<string, NivelCompetencia>()
  for (const e of existentes) {
    competenciasCatalogo.set(e.id, NIVEL_COMPETENCIA.includes(e.nivel) ? e.nivel : 'BASICO')
  }

  const sugerenciasMap = new Map<string, { nombre: string; nombre_normalizado: string; nivel: NivelCompetencia }>()

  for (const c of customs) {
    const trimmed = c.nombre.trim()
    const nivel: NivelCompetencia = NIVEL_COMPETENCIA.includes(c.nivel) ? c.nivel : 'BASICO'
    const norm = normalizarTexto(trimmed)

    const matchActiva = catalogoMap.get(norm)
    if (matchActiva) {
      // Coincide con competencia activa: va a postulante_competencia
      competenciasCatalogo.set(matchActiva.id, nivel)
    } else {
      // No coincide con ninguna activa (nueva o coincide con desactivada): va a sugerencias
      sugerenciasMap.set(norm, {
        nombre: trimmed,
        nombre_normalizado: norm,
        nivel,
      })
    }
  }

  // 3. Sugerencias del postulante con el cliente del usuario
  const rowsSugerencias = [...sugerenciasMap.values()].map((s) => ({
    perfil_tecnico_id: perfilTecnicoId,
    nombre: s.nombre,
    nombre_normalizado: s.nombre_normalizado,
    nivel: s.nivel,
  }))

  if (rowsSugerencias.length > 0) {
    const { error: upsertErr } = await supabase
      .from('competencia_sugerida')
      .upsert(rowsSugerencias, { onConflict: 'perfil_tecnico_id,nombre_normalizado' })

    if (upsertErr) {
      return { success: false, error: 'No se pudieron guardar las competencias.' }
    }
  }

  // Borrado de las sugerencias del postulante cuyo nombre_normalizado ya no está en la selección
  const { data: prevSugerencias, error: fetchSugErr } = await supabase
    .from('competencia_sugerida')
    .select('id, nombre_normalizado')
    .eq('perfil_tecnico_id', perfilTecnicoId)

  if (fetchSugErr) {
    return { success: false, error: 'No se pudieron guardar las competencias.' }
  }

  const normasActuales = new Set(rowsSugerencias.map((s) => s.nombre_normalizado))
  const aBorrarIds = (prevSugerencias ?? [])
    .filter((s) => !normasActuales.has(s.nombre_normalizado))
    .map((s) => s.id)

  if (aBorrarIds.length > 0) {
    const { error: delSugErr } = await supabase
      .from('competencia_sugerida')
      .delete()
      .in('id', aBorrarIds)

    if (delSugErr) {
      return { success: false, error: 'No se pudieron guardar las competencias.' }
    }
  }

  // 4. postulante_competencia: borrado previo con chequeo de error, después insert
  const { error: deleteError } = await supabase
    .from('postulante_competencia')
    .delete()
    .eq('perfil_tecnico_id', perfilTecnicoId)

  if (deleteError) {
    return { success: false, error: 'No se pudieron guardar las competencias.' }
  }

  if (competenciasCatalogo.size > 0) {
    const rows = [...competenciasCatalogo.entries()].map(([cid, nivel]) => ({
      perfil_tecnico_id: perfilTecnicoId,
      competencia_id: cid,
      nivel,
    }))

    const { error: insertError } = await supabase.from('postulante_competencia').insert(rows)
    if (insertError) return { success: false, error: 'No se pudieron guardar las competencias.' }
  }

  // 5. Construir items de retorno para actualización optimista de la UI
  let savedItems: CompetenciaGuardadaItem[] = []
  if (competenciasCatalogo.size > 0) {
    const { data: saved } = await supabase
      .from('competencia')
      .select('id, nombre')
      .in('id', [...competenciasCatalogo.keys()])

    savedItems = ((saved ?? []) as { id: string; nombre: string }[]).map((c) => ({
      id: c.id,
      nombre: c.nombre,
      nivel: competenciasCatalogo.get(c.id) ?? ('BASICO' as NivelCompetencia),
    }))
  }

  const sugerenciasItems: CompetenciaGuardadaItem[] = rowsSugerencias.map((s) => ({
    id: `custom:${s.nombre}`,
    nombre: s.nombre,
    nivel: s.nivel,
    pendiente: true,
  }))

  await marcarCambioPerfilTecnico(postulanteId)
  return { success: true, data: undefined, items: [...savedItems, ...sugerenciasItems] }
}
