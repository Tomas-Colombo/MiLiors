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

// ─── Ubicación: provincias ───────────────────────────────────────────────────

export async function crearProvincia(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin()
  const nombre = formData.get('nombre')?.toString().trim()
  if (!nombre) return { success: false, error: 'Ingresá el nombre de la provincia.' }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('provincia') as any).insert({ nombre })
  if (error?.code === '23505') return { success: false, error: 'Ya existe una provincia con ese nombre.' }
  if (error) return { success: false, error: 'No se pudo crear la provincia.' }

  revalidatePath('/admin/ubicaciones')
  return { success: true, data: undefined }
}

export async function renombrarProvincia(id: string, nombre: string): Promise<ActionResult> {
  await requireAdmin()
  const limpio = nombre.trim()
  if (!limpio) return { success: false, error: 'El nombre no puede quedar vacío.' }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('provincia') as any).update({ nombre: limpio }).eq('id', id)
  if (error?.code === '23505') return { success: false, error: 'Ya existe una provincia con ese nombre.' }
  if (error) return { success: false, error: 'No se pudo actualizar la provincia.' }

  revalidatePath('/admin/ubicaciones')
  return { success: true, data: undefined }
}

export async function desactivarProvincia(id: string): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('provincia') as any)
    .update({ fecha_baja: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, error: 'No se pudo desactivar.' }
  revalidatePath('/admin/ubicaciones')
  return { success: true, data: undefined }
}

export async function reactivarProvincia(id: string): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('provincia') as any).update({ fecha_baja: null }).eq('id', id)
  if (error) return { success: false, error: 'No se pudo reactivar.' }
  revalidatePath('/admin/ubicaciones')
  return { success: true, data: undefined }
}

// ─── Ubicación: localidades ──────────────────────────────────────────────────

export async function crearLocalidad(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin()
  const provinciaId = formData.get('provincia_id')?.toString()
  const nombre = formData.get('nombre')?.toString().trim()
  const departamento = formData.get('departamento')?.toString().trim() || null
  if (!provinciaId) return { success: false, error: 'Seleccioná una provincia primero.' }
  if (!nombre) return { success: false, error: 'Ingresá el nombre de la localidad.' }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('localidad') as any).insert({
    provincia_id: provinciaId,
    nombre,
    departamento,
  })
  if (error) return { success: false, error: 'No se pudo crear la localidad.' }

  revalidatePath('/admin/ubicaciones')
  return { success: true, data: undefined }
}

export async function renombrarLocalidad(id: string, nombre: string): Promise<ActionResult> {
  await requireAdmin()
  const limpio = nombre.trim()
  if (!limpio) return { success: false, error: 'El nombre no puede quedar vacío.' }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('localidad') as any).update({ nombre: limpio }).eq('id', id)
  if (error) return { success: false, error: 'No se pudo actualizar la localidad.' }

  revalidatePath('/admin/ubicaciones')
  return { success: true, data: undefined }
}

export async function desactivarLocalidad(id: string): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('localidad') as any)
    .update({ fecha_baja: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, error: 'No se pudo desactivar.' }
  revalidatePath('/admin/ubicaciones')
  return { success: true, data: undefined }
}

export async function reactivarLocalidad(id: string): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('localidad') as any).update({ fecha_baja: null }).eq('id', id)
  if (error) return { success: false, error: 'No se pudo reactivar.' }
  revalidatePath('/admin/ubicaciones')
  return { success: true, data: undefined }
}

// ─── Preguntas eneagrama ─────────────────────────────────────────────────────

// Nota: la creación de preguntas se maneja vía la API route POST /api/admin/preguntas
// (usada por el modal de creación). No dupliques esa lógica acá.

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

// ─── Términos y Condiciones ──────────────────────────────────────────────────

export async function publicarTyC(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin()
  const version = formData.get('version')?.toString().trim()
  const descripcion = formData.get('descripcion')?.toString().trim()

  if (!version) return { success: false, error: 'Ingresá el número de versión.' }
  if (!descripcion || descripcion.length < 20)
    return { success: false, error: 'El contenido de los términos es demasiado corto.' }

  const admin = createAdminClient()

  // 1. Insertar la nueva versión (queda vigente: fecha_baja_tyc = null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: nueva, error } = await (admin.from('terminos_y_condiciones') as any)
    .insert({ version, descripcion })
    .select('id')
    .single()
  if (error?.code === '23505') return { success: false, error: 'Ya existe una versión con ese número.' }
  if (error || !nueva) return { success: false, error: 'No se pudo publicar la nueva versión.' }

  // 2. Dar de baja las versiones vigentes anteriores (debe quedar una sola vigente)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from('terminos_y_condiciones') as any)
    .update({ fecha_baja_tyc: new Date().toISOString() })
    .is('fecha_baja_tyc', null)
    .neq('id', (nueva as { id: string }).id)

  // Recargar el layout raíz para que el gate de TyC vuelva a evaluarse en todos los usuarios
  revalidatePath('/admin/tyc')
  revalidatePath('/', 'layout')
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

export async function reactivarPostulante(postulanteId: string): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('perfil_postulante') as any)
    .update({ perfil_en_busqueda: true })
    .eq('id', postulanteId)
  if (error) return { success: false, error: 'No se pudo reactivar el perfil.' }
  revalidatePath('/admin/postulantes')
  return { success: true, data: undefined }
}
