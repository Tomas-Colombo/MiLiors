'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import { formacionSchema, experienciaSchema, idiomaSchema } from './schema'
import type { ActionResult } from '@/lib/types/domain'

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: created } = await (admin.from('perfil_tecnico') as any)
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

// ─── FORMACIÓN ────────────────────────────────────────────────────────────────

function resolveInstitucion(formData: FormData): string | null {
  const institucion = formData.get('institucion') as string | null
  if (institucion === 'Otra') {
    const personalizada = (formData.get('institucion_personalizada') as string | null)?.trim()
    return personalizada || null
  }
  return institucion
}

export async function agregarFormacion(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = formacionSchema.safeParse({
    institucion: resolveInstitucion(formData),
    titulo: formData.get('titulo'),
    fecha_graduacion: formData.get('fecha_graduacion') || undefined,
  })
  if (!parsed.success) {
    return { success: false, error: 'Revisá los campos.', fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const postulanteId = await getPostulanteId()
  if (!postulanteId) return { success: false, error: 'Perfil no encontrado.' }

  const perfilTecnicoId = await getOrCreatePerfilTecnico(postulanteId)
  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('formacion_academica') as any).insert({
    perfil_tecnico_id: perfilTecnicoId,
    institucion: parsed.data.institucion,
    titulo: parsed.data.titulo,
    fecha_graduacion: toDate(parsed.data.fecha_graduacion),
  })

  if (error) return { success: false, error: 'No se pudo guardar la formación.' }
  revalidatePath('/postulante/perfil')
  return { success: true, data: undefined }
}

export async function editarFormacion(
  id: string,
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = formacionSchema.safeParse({
    institucion: resolveInstitucion(formData),
    titulo: formData.get('titulo'),
    fecha_graduacion: formData.get('fecha_graduacion') || undefined,
  })
  if (!parsed.success) {
    return { success: false, error: 'Revisá los campos.', fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const postulanteId = await getPostulanteId()
  if (!postulanteId) return { success: false, error: 'Perfil no encontrado.' }

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('formacion_academica') as any)
    .update({
      institucion: parsed.data.institucion,
      titulo: parsed.data.titulo,
      fecha_graduacion: toDate(parsed.data.fecha_graduacion),
    })
    .eq('id', id)

  if (error) return { success: false, error: 'No se pudo actualizar la formación.' }
  revalidatePath('/postulante/perfil')
  return { success: true, data: undefined }
}

export async function eliminarFormacion(id: string): Promise<ActionResult> {
  await verifySession()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('formacion_academica') as any).delete().eq('id', id)
  if (error) return { success: false, error: 'No se pudo eliminar.' }
  revalidatePath('/postulante/perfil')
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('experiencia_laboral') as any).insert({
    perfil_tecnico_id: perfilTecnicoId,
    empresa: parsed.data.empresa,
    puesto: parsed.data.puesto,
    fecha_inicio: toDate(parsed.data.fecha_inicio)!,
    fecha_fin: toDate(parsed.data.fecha_fin),
    descripcion: parsed.data.descripcion || null,
  })

  if (error) return { success: false, error: 'No se pudo guardar la experiencia.' }
  revalidatePath('/postulante/perfil')
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

  await verifySession()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('experiencia_laboral') as any)
    .update({
      empresa: parsed.data.empresa,
      puesto: parsed.data.puesto,
      fecha_inicio: toDate(parsed.data.fecha_inicio)!,
      fecha_fin: toDate(parsed.data.fecha_fin),
      descripcion: parsed.data.descripcion || null,
    })
    .eq('id', id)

  if (error) return { success: false, error: 'No se pudo actualizar.' }
  revalidatePath('/postulante/perfil')
  return { success: true, data: undefined }
}

export async function eliminarExperiencia(id: string): Promise<ActionResult> {
  await verifySession()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('experiencia_laboral') as any).delete().eq('id', id)
  if (error) return { success: false, error: 'No se pudo eliminar.' }
  revalidatePath('/postulante/perfil')
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('idioma') as any).insert({
    perfil_tecnico_id: perfilTecnicoId,
    nombre: parsed.data.nombre,
    nivel_idioma: parsed.data.nivel_idioma,
  })

  if (error) return { success: false, error: 'No se pudo guardar el idioma.' }
  revalidatePath('/postulante/perfil')
  return { success: true, data: undefined }
}

export async function eliminarIdioma(id: string): Promise<ActionResult> {
  await verifySession()
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('idioma') as any).delete().eq('id', id)
  if (error) return { success: false, error: 'No se pudo eliminar.' }
  revalidatePath('/postulante/perfil')
  return { success: true, data: undefined }
}

// ─── COMPETENCIAS (full set) ──────────────────────────────────────────────────

export async function guardarCompetencias(competenciaIds: string[]): Promise<ActionResult> {
  const postulanteId = await getPostulanteId()
  if (!postulanteId) return { success: false, error: 'Perfil no encontrado.' }

  const perfilTecnicoId = await getOrCreatePerfilTecnico(postulanteId)
  const admin = createAdminClient()

  // Delete all current competencies
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from('postulante_competencia') as any)
    .delete()
    .eq('perfil_tecnico_id', perfilTecnicoId)

  if (competenciaIds.length === 0) {
    revalidatePath('/postulante/perfil')
    return { success: true, data: undefined }
  }

  // Re-insert the selected ones
  const rows = competenciaIds.map((cid) => ({
    perfil_tecnico_id: perfilTecnicoId,
    competencia_id: cid,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('postulante_competencia') as any).insert(rows)
  if (error) return { success: false, error: 'No se pudieron guardar las competencias.' }

  revalidatePath('/postulante/perfil')
  return { success: true, data: undefined }
}

/**
 * Saves competencies for the current applicant.
 * `existingIds` — UUIDs already in the catalog.
 * `customNames` — free-text names to upsert into the catalog first.
 * Returns the final list of saved CompetenciaItem so the UI can update optimistically.
 */
export async function guardarCompetenciasConCustom(
  existingIds: string[],
  customNames: string[]
): Promise<ActionResult & { items?: { id: string; nombre: string }[] }> {
  if (existingIds.length + customNames.length > 15) {
    return { success: false, error: 'Podés seleccionar hasta 15 competencias.' }
  }

  const postulanteId = await getPostulanteId()
  if (!postulanteId) return { success: false, error: 'Perfil no encontrado.' }

  const perfilTecnicoId = await getOrCreatePerfilTecnico(postulanteId)
  const admin = createAdminClient()

  // Resolve custom names → IDs (upsert by nombre, which is UNIQUE)
  const customIds: string[] = []
  for (const nombre of customNames) {
    const trimmed = nombre.trim()
    if (!trimmed) continue

    // Try insert; if the nombre already exists the conflict returns nothing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inserted } = await (admin.from('competencia') as any)
      .insert({ nombre: trimmed })
      .select('id')
      .single()

    if (inserted) {
      customIds.push((inserted as { id: string }).id)
    } else {
      // nombre already exists — fetch the existing id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (admin.from('competencia') as any)
        .select('id')
        .eq('nombre', trimmed)
        .single()
      if (existing) customIds.push((existing as { id: string }).id)
    }
  }

  const allIds = [...new Set([...existingIds, ...customIds])]

  // Replace all competencies for this profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from('postulante_competencia') as any)
    .delete()
    .eq('perfil_tecnico_id', perfilTecnicoId)

  if (allIds.length === 0) {
    revalidatePath('/postulante/perfil')
    return { success: true, data: undefined, items: [] }
  }

  const rows = allIds.map((cid) => ({
    perfil_tecnico_id: perfilTecnicoId,
    competencia_id: cid,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('postulante_competencia') as any).insert(rows)
  if (error) return { success: false, error: 'No se pudieron guardar las competencias.' }

  // Fetch the saved items to return updated state to the UI
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: saved } = await (admin.from('competencia') as any)
    .select('id, nombre')
    .in('id', allIds)

  revalidatePath('/postulante/perfil')
  return { success: true, data: undefined, items: (saved ?? []) as { id: string; nombre: string }[] }
}
