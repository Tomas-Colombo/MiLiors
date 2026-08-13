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

// ─── Idiomas ─────────────────────────────────────────────────────────────────

export async function crearIdioma(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin()
  const nombre = formData.get('nombre')?.toString().trim()
  if (!nombre) return { success: false, error: 'Ingresá un nombre de idioma.' }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('idioma_catalogo') as any).insert({ nombre })
  if (error?.code === '23505') return { success: false, error: 'Ya existe un idioma con ese nombre.' }
  if (error) return { success: false, error: 'No se pudo crear el idioma.' }

  revalidatePath('/admin/idiomas')
  return { success: true, data: undefined }
}

export async function desactivarIdioma(id: string): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('idioma_catalogo') as any)
    .update({ fecha_baja: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, error: 'No se pudo desactivar.' }
  revalidatePath('/admin/idiomas')
  return { success: true, data: undefined }
}

export async function reactivarIdioma(id: string): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('idioma_catalogo') as any)
    .update({ fecha_baja: null })
    .eq('id', id)
  if (error) return { success: false, error: 'No se pudo reactivar.' }
  revalidatePath('/admin/idiomas')
  return { success: true, data: undefined }
}

// ─── Carreras ────────────────────────────────────────────────────────────────

export async function crearCarrera(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin()
  const nombre = formData.get('nombre')?.toString().trim()
  if (!nombre) return { success: false, error: 'Ingresá el nombre de la carrera.' }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('carrera') as any).insert({ nombre })
  if (error?.code === '23505') return { success: false, error: 'Ya existe una carrera con ese nombre.' }
  if (error) return { success: false, error: 'No se pudo crear la carrera.' }

  revalidatePath('/admin/carreras')
  return { success: true, data: undefined }
}

export async function renombrarCarrera(id: string, nuevoNombre: string): Promise<ActionResult> {
  await requireAdmin()
  const limpio = nuevoNombre.trim()
  if (!limpio) return { success: false, error: 'El nombre no puede quedar vacío.' }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('carrera') as any).update({ nombre: limpio }).eq('id', id)
  if (error?.code === '23505') return { success: false, error: 'Ya existe una carrera con ese nombre.' }
  if (error) return { success: false, error: 'No se pudo actualizar la carrera.' }

  revalidatePath('/admin/carreras')
  return { success: true, data: undefined }
}

export async function desactivarCarrera(id: string): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('carrera') as any)
    .update({ fecha_baja: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, error: 'No se pudo desactivar.' }
  revalidatePath('/admin/carreras')
  return { success: true, data: undefined }
}

export async function reactivarCarrera(id: string): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('carrera') as any).update({ fecha_baja: null }).eq('id', id)
  if (error) return { success: false, error: 'No se pudo reactivar.' }
  revalidatePath('/admin/carreras')
  return { success: true, data: undefined }
}

/**
 * Promueve un valor libre de `carrera_otra` a una carrera del catálogo:
 * crea la carrera si no existe (o reusa la activa con ese nombre) y
 * re-vincula todos los perfiles que tenían ese texto libre.
 */
export async function promoverCarreraOtra(nombre: string): Promise<ActionResult> {
  await requireAdmin()
  const limpio = nombre.trim()
  if (!limpio) return { success: false, error: 'Nombre inválido.' }

  const admin = createAdminClient()

  // 1. Buscar una carrera activa existente con ese nombre (case-insensitive).
  const { data: existente } = await admin
    .from('carrera')
    .select('id')
    .is('fecha_baja', null)
    .ilike('nombre', limpio)
    .maybeSingle()

  let carreraId = (existente as { id: string } | null)?.id ?? null

  if (!carreraId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: creada, error } = await (admin.from('carrera') as any)
      .insert({ nombre: limpio })
      .select('id')
      .single()
    if (error?.code === '23505') {
      // Carrera creada concurrentemente entre el select y el insert: reintentar el lookup.
      const { data: recheck } = await admin
        .from('carrera')
        .select('id')
        .is('fecha_baja', null)
        .ilike('nombre', limpio)
        .maybeSingle()
      carreraId = (recheck as { id: string } | null)?.id ?? null
      if (!carreraId) return { success: false, error: 'No se pudo promover la carrera.' }
    } else if (error || !creada) {
      return { success: false, error: 'No se pudo crear la carrera.' }
    } else {
      carreraId = (creada as { id: string }).id
    }
  }

  // 2. Re-vincular perfiles que tenían ese texto libre.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (admin.from('perfil_postulante') as any)
    .update({ carrera_id: carreraId, carrera_otra: null })
    .ilike('carrera_otra', limpio)

  if (updateError) return { success: false, error: 'No se pudo re-vincular a los postulantes.' }

  revalidatePath('/admin/carreras')
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

// ─── Configuración del sistema ───────────────────────────────────────────────

/**
 * Actualiza el período (en días) tras el cual un puesto sin actividad del
 * reclutador se cierra automáticamente. Lo consume la función SQL
 * `cerrar_puestos_inactivos()` y las alertas/copys del frontend.
 */
export async function actualizarDiasInactividad(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin()
  const dias = Number(formData.get('dias'))
  if (!Number.isInteger(dias) || dias < 1 || dias > 3650) {
    return { success: false, error: 'Ingresá un número entero de días entre 1 y 3650.' }
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('configuracion_sistema') as any)
    .update({ dias_inactividad_cierre: dias, updated_at: new Date().toISOString() })
    .eq('id', true)
  if (error) return { success: false, error: 'No se pudo actualizar la configuración.' }

  revalidatePath('/admin/empresas')
  return { success: true, data: undefined }
}

/**
 * Actualiza cada cuánto vuelve a ofrecerse el cuadro de opinión del informe.
 * Lo consumen `getFeedbackInforme` (para decidir si mostrarlo) y la propia
 * action que guarda la opinión (para no aceptar reenvíos antes de tiempo).
 */
export async function actualizarDiasReactivarFeedback(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin()
  const dias = Number(formData.get('dias'))
  if (!Number.isInteger(dias) || dias < 1 || dias > 3650) {
    return { success: false, error: 'Ingresá un número entero de días entre 1 y 3650.' }
  }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('configuracion_sistema') as any)
    .update({ dias_reactivar_feedback: dias, updated_at: new Date().toISOString() })
    .eq('id', true)
  if (error) return { success: false, error: 'No se pudo actualizar la configuración.' }

  revalidatePath('/admin/feedback')
  revalidatePath('/postulante/informe')
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
