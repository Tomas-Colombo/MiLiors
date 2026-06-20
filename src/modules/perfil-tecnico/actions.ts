'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import { formacionSchema, experienciaSchema, idiomaSchema } from './schema'
import type { ActionResult } from '@/lib/types/domain'

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

export async function agregarFormacion(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = formacionSchema.safeParse({
    institucion: formData.get('institucion'),
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
    fecha_graduacion: parsed.data.fecha_graduacion || null,
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
    institucion: formData.get('institucion'),
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
      fecha_graduacion: parsed.data.fecha_graduacion || null,
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
    fecha_inicio: parsed.data.fecha_inicio,
    fecha_fin: parsed.data.fecha_fin || null,
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
      fecha_inicio: parsed.data.fecha_inicio,
      fecha_fin: parsed.data.fecha_fin || null,
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
  const parsed = idiomaSchema.safeParse({
    nombre: formData.get('nombre'),
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
