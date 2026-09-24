'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import { formacionSchema, experienciaSchema, idiomaSchema, cursoSchema } from './schema'
import type { ActionResult } from '@/lib/types/domain'
import { NIVEL_COMPETENCIA, type NivelCompetencia } from '@/lib/constants/enums'

// Converts YYYY-MM → YYYY-MM-01 for Postgres DATE columns
function toDate(mesAnio: string | undefined): string | null {
  if (!mesAnio) return null
  return `${mesAnio}-01`
}

// Helper: get or create perfil_tecnico
async function getOrCreatePerfilTecnico(postulanteId: string): Promise<string> {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: existing } = await supabase
    .from('perfil_tecnico')
    .select('id')
    .eq('postulante_id', postulanteId)
    .single()

  if (existing) return (existing as { id: string }).id

  const { data: created } = await admin.from('perfil_tecnico')
    .insert({ postulante_id: postulanteId })
    .select('id')
    .single()

  return (created as { id: string }).id
}

// Helper: get postulante_id for the current user
async function getPostulanteId(): Promise<string | null> {
  const session = await verifySession()
  const supabase = await createClient()
  const { data } = await supabase
    .from('perfil_postulante')
    .select('id')
    .eq('usuario_id', session.id)
    .single()
  return data ? (data as { id: string }).id : null
}

/**
 * El certificado emitido es una foto firmada del perfil tecnico: cualquier
 * cambio de formacion, cursos, experiencia, idiomas o competencias lo deja
 * viejo. Aca solo prendemos el flag (una escritura, sin LLM); regenerar la
 * sintesis y re-emitir el PDF queda a cargo del boton "Actualizar certificado"
 * en /postulante/certificado. Mismo patron que eneagrama.
 */
async function marcarCambioPerfilTecnico(postulanteId: string | null): Promise<void> {
  if (postulanteId) {
    const admin = createAdminClient()
    const { error } = await admin.from('certificado_pdf')
      .update({ desactualizado: true })
      .eq('postulante_id', postulanteId)
    if (error) {
      console.error('[perfil-tecnico] No se pudo marcar el certificado desactualizado:', error.message)
    }
  }
  revalidatePath('/postulante/perfil')
  revalidatePath('/postulante/certificado')
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
  const admin = createAdminClient()

  const { error } = await admin.from('formacion_academica').insert({
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
  const admin = createAdminClient()

  const { error } = await admin.from('curso').insert({
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
  const admin = createAdminClient()

  const { error } = await admin.from('experiencia_laboral').insert({
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
  const admin = createAdminClient()

  const { error } = await admin.from('idioma').insert({
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
  const admin = createAdminClient()

  // Delete all current competencies
  await admin.from('postulante_competencia')
    .delete()
    .eq('perfil_tecnico_id', perfilTecnicoId)

  if (competenciaIds.length === 0) {
    await marcarCambioPerfilTecnico(postulanteId)
    return { success: true, data: undefined }
  }

  // Re-insert the selected ones
  const rows = competenciaIds.map((cid) => ({
    perfil_tecnico_id: perfilTecnicoId,
    competencia_id: cid,
  }))

  const { error } = await admin.from('postulante_competencia').insert(rows)
  if (error) return { success: false, error: 'No se pudieron guardar las competencias.' }

  await marcarCambioPerfilTecnico(postulanteId)
  return { success: true, data: undefined }
}

export type CompetenciaExistenteInput = { id: string; nivel: NivelCompetencia }
export type CompetenciaCustomInput = { nombre: string; nivel: NivelCompetencia }

/**
 * Saves competencies for the current applicant.
 * `existentes` — items already in the catalog, with their level.
 * `customs` — free-text names to upsert into the catalog first, with their level.
 * Returns the final list of saved items so the UI can update optimistically.
 */
export async function guardarCompetenciasConCustom(
  existentes: CompetenciaExistenteInput[],
  customs: CompetenciaCustomInput[]
): Promise<ActionResult & { items?: { id: string; nombre: string; nivel: NivelCompetencia }[] }> {
  if (existentes.length + customs.length > 15) {
    return { success: false, error: 'Podés seleccionar hasta 15 competencias.' }
  }

  const postulanteId = await getPostulanteId()
  if (!postulanteId) return { success: false, error: 'Perfil no encontrado.' }

  const perfilTecnicoId = await getOrCreatePerfilTecnico(postulanteId)
  const admin = createAdminClient()

  // id → nivel (dedupes; el último gana)
  const niveles = new Map<string, NivelCompetencia>()
  for (const e of existentes) {
    niveles.set(e.id, NIVEL_COMPETENCIA.includes(e.nivel) ? e.nivel : 'BASICO')
  }

  // Resolve custom names → IDs (upsert by nombre, which is UNIQUE)
  for (const c of customs) {
    const trimmed = c.nombre.trim()
    if (!trimmed) continue
    const nivel: NivelCompetencia = NIVEL_COMPETENCIA.includes(c.nivel) ? c.nivel : 'BASICO'

    // Try insert; if the nombre already exists the conflict returns nothing
    const { data: inserted } = await admin.from('competencia')
      .insert({ nombre: trimmed })
      .select('id')
      .single()

    if (inserted) {
      niveles.set((inserted as { id: string }).id, nivel)
    } else {
      // nombre already exists — fetch the existing id
      const { data: existing } = await admin.from('competencia')
        .select('id')
        .eq('nombre', trimmed)
        .single()
      if (existing) niveles.set((existing as { id: string }).id, nivel)
    }
  }

  // Replace all competencies for this profile
  await admin.from('postulante_competencia')
    .delete()
    .eq('perfil_tecnico_id', perfilTecnicoId)

  if (niveles.size === 0) {
    await marcarCambioPerfilTecnico(postulanteId)
    return { success: true, data: undefined, items: [] }
  }

  const rows = [...niveles].map(([cid, nivel]) => ({
    perfil_tecnico_id: perfilTecnicoId,
    competencia_id: cid,
    nivel,
  }))

  const { error } = await admin.from('postulante_competencia').insert(rows)
  if (error) return { success: false, error: 'No se pudieron guardar las competencias.' }

  // Fetch the saved items to return updated state to the UI
  const { data: saved } = await admin.from('competencia')
    .select('id, nombre')
    .in('id', [...niveles.keys()])

  await marcarCambioPerfilTecnico(postulanteId)
  const items = ((saved ?? []) as { id: string; nombre: string }[]).map((c) => ({
    ...c,
    nivel: niveles.get(c.id) ?? ('BASICO' as NivelCompetencia),
  }))
  return { success: true, data: undefined, items }
}
