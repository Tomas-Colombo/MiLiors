'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import type { ActionResult } from '@/lib/types/domain'

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
