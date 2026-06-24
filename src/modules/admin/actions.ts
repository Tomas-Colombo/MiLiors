'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import type { ActionResult } from '@/lib/types/domain'
import { resetearTestsEnProgreso } from '@/modules/eneagrama/service'

// Guard ADMIN
async function requireAdmin() {
  const session = await verifySession()
  if (session.rol !== 'ADMIN') throw new Error('Acceso denegado.')
  return session
}

// ─── Sectores ────────────────────────────────────────────────────────────────

export async function crearSector(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin()
  const nombre = formData.get('nombre_sector')?.toString().trim()
  if (!nombre) return { success: false, error: 'Ingresá un nombre de sector.' }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('sector_industrial') as any).insert({ nombre_sector: nombre })
  if (error?.code === '23505') return { success: false, error: 'Ya existe un sector con ese nombre.' }
  if (error) return { success: false, error: 'No se pudo crear el sector.' }

  revalidatePath('/admin/sectores')
  return { success: true, data: undefined }
}

export async function desactivarSector(id: string): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('sector_industrial') as any)
    .update({ fecha_baja_s: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, error: 'No se pudo desactivar.' }
  revalidatePath('/admin/sectores')
  return { success: true, data: undefined }
}

export async function reactivarSector(id: string): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('sector_industrial') as any)
    .update({ fecha_baja_s: null })
    .eq('id', id)
  if (error) return { success: false, error: 'No se pudo reactivar.' }
  revalidatePath('/admin/sectores')
  return { success: true, data: undefined }
}

// ─── Competencias ────────────────────────────────────────────────────────────

export async function crearCompetencia(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin()
  const nombre = formData.get('nombre')?.toString().trim()
  if (!nombre) return { success: false, error: 'Ingresá un nombre de competencia.' }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('competencia') as any).insert({ nombre })
  if (error?.code === '23505') return { success: false, error: 'Ya existe una competencia con ese nombre.' }
  if (error) return { success: false, error: 'No se pudo crear la competencia.' }

  revalidatePath('/admin/competencias')
  return { success: true, data: undefined }
}

export async function desactivarCompetencia(id: string): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('competencia') as any)
    .update({ fecha_baja: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, error: 'No se pudo desactivar.' }
  revalidatePath('/admin/competencias')
  return { success: true, data: undefined }
}

export async function reactivarCompetencia(id: string): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('competencia') as any)
    .update({ fecha_baja: null })
    .eq('id', id)
  if (error) return { success: false, error: 'No se pudo reactivar.' }
  revalidatePath('/admin/competencias')
  return { success: true, data: undefined }
}

// ─── Preguntas eneagrama ─────────────────────────────────────────────────────

export async function crearPregunta(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin()
  const enunciado = formData.get('enunciado')?.toString().trim()
  const eneatipo_asociado = Number(formData.get('eneatipo_asociado'))

  if (!enunciado) return { success: false, error: 'El enunciado no puede estar vacío.' }
  if (isNaN(eneatipo_asociado) || eneatipo_asociado < 1 || eneatipo_asociado > 9)
    return { success: false, error: 'Eneatipo debe ser entre 1 y 9.' }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: maxRow } = await (admin.from('pregunta_eneagrama') as any)
    .select('numero_pregunta')
    .order('numero_pregunta', { ascending: false })
    .limit(1)
    .maybeSingle()
  const numero_pregunta = ((maxRow as { numero_pregunta: number } | null)?.numero_pregunta ?? 0) + 1

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('pregunta_eneagrama') as any)
    .insert({ enunciado, eneatipo_asociado, numero_pregunta })
  if (error) return { success: false, error: 'No se pudo crear la pregunta.' }

  await resetearTestsEnProgreso()
  revalidatePath('/admin/preguntas')
  return { success: true, data: undefined }
}

export async function editarPregunta(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin()
  const id = formData.get('id')?.toString()
  const enunciado = formData.get('enunciado')?.toString().trim()
  const eneatipo_asociado = Number(formData.get('eneatipo_asociado'))

  if (!id || !enunciado) return { success: false, error: 'Datos incompletos.' }
  if (isNaN(eneatipo_asociado) || eneatipo_asociado < 1 || eneatipo_asociado > 9)
    return { success: false, error: 'Eneatipo debe ser entre 1 y 9.' }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('pregunta_eneagrama') as any)
    .update({ enunciado, eneatipo_asociado })
    .eq('id', id)
  if (error) return { success: false, error: 'No se pudo guardar la pregunta.' }

  revalidatePath('/admin/preguntas')
  return { success: true, data: undefined }
}

export async function eliminarPregunta(id: string): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('pregunta_eneagrama') as any)
    .update({ fecha_baja: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, error: 'No se pudo eliminar la pregunta.' }
  await resetearTestsEnProgreso()
  revalidatePath('/admin/preguntas')
  return { success: true, data: undefined }
}

export async function togglePausarPregunta(id: string, pausada: boolean): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('pregunta_eneagrama') as any)
    .update({ pausada })
    .eq('id', id)
  if (error) return { success: false, error: 'No se pudo cambiar el estado.' }
  await resetearTestsEnProgreso()
  revalidatePath('/admin/preguntas')
  return { success: true, data: undefined }
}

// ─── Moderación postulantes ──────────────────────────────────────────────────

export async function desactivarPostulante(postulanteId: string): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('perfil_postulante') as any)
    .update({ perfil_en_busqueda: false })
    .eq('id', postulanteId)
  if (error) return { success: false, error: 'No se pudo desactivar el perfil.' }
  revalidatePath('/admin/postulantes')
  return { success: true, data: undefined }
}
