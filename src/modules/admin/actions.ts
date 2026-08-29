'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import type { ActionResult } from '@/lib/types/domain'
import { resetearTestsEnProgreso } from '@/modules/eneagrama/service'
import { patronTextoCompleto } from '@/lib/texto'

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
  const { error } = await admin.from('sector_industrial').insert({ nombre_sector: nombre })
  if (error?.code === '23505') return { success: false, error: 'Ya existe un sector con ese nombre.' }
  if (error) return { success: false, error: 'No se pudo crear el sector.' }

  revalidatePath('/admin/sectores')
  return { success: true, data: undefined }
}

export async function desactivarSector(id: string): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('sector_industrial')
    .update({ fecha_baja_s: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, error: 'No se pudo desactivar.' }
  revalidatePath('/admin/sectores')
  return { success: true, data: undefined }
}

export async function reactivarSector(id: string): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('sector_industrial')
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
  const { error } = await admin.from('competencia').insert({ nombre })
  if (error?.code === '23505') return { success: false, error: 'Ya existe una competencia con ese nombre.' }
  if (error) return { success: false, error: 'No se pudo crear la competencia.' }

  revalidatePath('/admin/competencias')
  return { success: true, data: undefined }
}

export async function desactivarCompetencia(id: string): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('competencia')
    .update({ fecha_baja: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, error: 'No se pudo desactivar.' }
  revalidatePath('/admin/competencias')
  return { success: true, data: undefined }
}

export async function reactivarCompetencia(id: string): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('competencia')
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
  const { error } = await admin.from('idioma_catalogo').insert({ nombre })
  if (error?.code === '23505') return { success: false, error: 'Ya existe un idioma con ese nombre.' }
  if (error) return { success: false, error: 'No se pudo crear el idioma.' }

  revalidatePath('/admin/idiomas')
  return { success: true, data: undefined }
}

export async function desactivarIdioma(id: string): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('idioma_catalogo')
    .update({ fecha_baja: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, error: 'No se pudo desactivar.' }
  revalidatePath('/admin/idiomas')
  return { success: true, data: undefined }
}

export async function reactivarIdioma(id: string): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('idioma_catalogo')
    .update({ fecha_baja: null })
    .eq('id', id)
  if (error) return { success: false, error: 'No se pudo reactivar.' }
  revalidatePath('/admin/idiomas')
  return { success: true, data: undefined }
}

// ─── Carreras ────────────────────────────────────────────────────────────────

/**
 * La carrera activa que ya ocupa ese nombre, ignorando tildes y mayúsculas.
 *
 * El índice único de la tabla es `lower(nombre)`: para Postgres "Ingenieria" e
 * "Ingeniería" son dos nombres distintos y las dos filas entrarían al catálogo.
 * El catálogo tiene que ofrecer UNA sola opción por carrera —si no, el
 * postulante elige una y el reclutador filtra por la otra—, así que el chequeo
 * vive acá, en las tres puertas de entrada: alta, renombrado y promoción.
 *
 * Sólo mira las activas, igual que el índice: un nombre liberado por una baja
 * se puede volver a usar.
 */
async function carreraConMismoNombre(
  admin: ReturnType<typeof createAdminClient>,
  nombre: string,
  excluirId?: string,
): Promise<{ id: string; nombre: string } | null> {
  let query = admin
    .from('carrera')
    .select('id, nombre')
    .is('fecha_baja', null)
    .regexIMatch('nombre', patronTextoCompleto(nombre))
  if (excluirId) query = query.neq('id', excluirId)

  const { data } = await query.limit(1)
  const filas = (data ?? []) as { id: string; nombre: string }[]
  return filas[0] ?? null
}


export async function crearCarrera(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin()
  const nombre = formData.get('nombre')?.toString().trim()
  if (!nombre) return { success: false, error: 'Ingresá el nombre de la carrera.' }

  const admin = createAdminClient()
  const duplicada = await carreraConMismoNombre(admin, nombre)
  if (duplicada) {
    return { success: false, error: `Ya existe “${duplicada.nombre}” en el catálogo.` }
  }

  const { error } = await admin.from('carrera').insert({ nombre })
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
  const duplicada = await carreraConMismoNombre(admin, limpio, id)
  if (duplicada) {
    return { success: false, error: `Ya existe “${duplicada.nombre}” en el catálogo.` }
  }

  const { error } = await admin.from('carrera').update({ nombre: limpio }).eq('id', id)
  if (error?.code === '23505') return { success: false, error: 'Ya existe una carrera con ese nombre.' }
  if (error) return { success: false, error: 'No se pudo actualizar la carrera.' }

  revalidatePath('/admin/carreras')
  return { success: true, data: undefined }
}

export async function desactivarCarrera(id: string): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('carrera')
    .update({ fecha_baja: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, error: 'No se pudo desactivar.' }
  revalidatePath('/admin/carreras')
  return { success: true, data: undefined }
}

export async function reactivarCarrera(id: string): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('carrera').update({ fecha_baja: null }).eq('id', id)
  if (error) return { success: false, error: 'No se pudo reactivar.' }
  revalidatePath('/admin/carreras')
  return { success: true, data: undefined }
}

/**
 * Promueve un valor libre de `carrera_otra` a una carrera del catálogo.
 *
 * Recibe DOS nombres porque no siempre son el mismo: `textoLibre` es lo que el
 * postulante escribió a mano y es la clave para encontrar sus perfiles;
 * `nombreOficial` es lo que el admin confirmó en el diálogo, ya corregido de
 * ortografía. Si se usara uno solo, corregir "Ingenieria" a "Ingeniería"
 * dejaría al postulante original sin re-vincular.
 *
 * La búsqueda y el re-vinculado ignoran tildes: promover "Ingenieria" absorbe
 * también a quienes habían escrito "Ingeniería", que es el punto —el catálogo
 * tiene que quedar con UNA sola opción por carrera.
 */
export async function promoverCarreraOtra(
  textoLibre: string,
  nombreOficial?: string,
): Promise<ActionResult> {
  await requireAdmin()
  const original = textoLibre.trim()
  const oficial = (nombreOficial ?? textoLibre).trim()
  if (!original || !oficial) return { success: false, error: 'Nombre inválido.' }

  const admin = createAdminClient()

  // 1. Reusar la carrera activa que ya ocupe ese nombre, con o sin tildes.
  let carreraId = (await carreraConMismoNombre(admin, oficial))?.id ?? null

  if (!carreraId) {
    const { data: creada, error } = await admin.from('carrera')
      .insert({ nombre: oficial })
      .select('id')
      .single()
    if (error?.code === '23505') {
      // Carrera creada concurrentemente entre el select y el insert: reintentar el lookup.
      carreraId = (await carreraConMismoNombre(admin, oficial))?.id ?? null
      if (!carreraId) return { success: false, error: 'No se pudo promover la carrera.' }
    } else if (error || !creada) {
      return { success: false, error: 'No se pudo crear la carrera.' }
    } else {
      carreraId = (creada as { id: string }).id
    }
  }

  // 2. Re-vincular los perfiles que tenían ese texto libre, escrito con tildes
  //    o sin ellas. `regexIMatch` anclado: compara el nombre entero, así
  //    promover "Derecho" no se lleva puesto a "Derecho del Trabajo".
  const { error: updateError } = await admin.from('perfil_postulante')
    .update({ carrera_id: carreraId, carrera_otra: null })
    .regexIMatch('carrera_otra', patronTextoCompleto(original))

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
  const { error } = await admin.from('provincia').insert({ nombre })
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
  const { error } = await admin.from('provincia').update({ nombre: limpio }).eq('id', id)
  if (error?.code === '23505') return { success: false, error: 'Ya existe una provincia con ese nombre.' }
  if (error) return { success: false, error: 'No se pudo actualizar la provincia.' }

  revalidatePath('/admin/ubicaciones')
  return { success: true, data: undefined }
}

export async function desactivarProvincia(id: string): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('provincia')
    .update({ fecha_baja: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, error: 'No se pudo desactivar.' }
  revalidatePath('/admin/ubicaciones')
  return { success: true, data: undefined }
}

export async function reactivarProvincia(id: string): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('provincia').update({ fecha_baja: null }).eq('id', id)
  if (error) return { success: false, error: 'No se pudo reactivar.' }
  revalidatePath('/admin/ubicaciones')
  return { success: true, data: undefined }
}

// ─── Ubicación: departamentos ────────────────────────────────────────────────

export async function crearDepartamento(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin()
  const provinciaId = formData.get('provincia_id')?.toString()
  const nombre = formData.get('nombre')?.toString().trim()
  if (!provinciaId) return { success: false, error: 'Seleccioná una provincia primero.' }
  if (!nombre) return { success: false, error: 'Ingresá el nombre del departamento.' }

  const admin = createAdminClient()
  const { error } = await admin.from('departamento').insert({
    provincia_id: provinciaId,
    nombre,
  })
  if (error?.code === '23505') return { success: false, error: 'Ya existe un departamento con ese nombre en la provincia.' }
  if (error) return { success: false, error: 'No se pudo crear el departamento.' }

  revalidatePath('/admin/ubicaciones')
  return { success: true, data: undefined }
}

export async function renombrarDepartamento(id: string, nombre: string): Promise<ActionResult> {
  await requireAdmin()
  const limpio = nombre.trim()
  if (!limpio) return { success: false, error: 'El nombre no puede quedar vacío.' }

  const admin = createAdminClient()
  const { error } = await admin.from('departamento').update({ nombre: limpio }).eq('id', id)
  if (error?.code === '23505') return { success: false, error: 'Ya existe un departamento con ese nombre en la provincia.' }
  if (error) return { success: false, error: 'No se pudo actualizar el departamento.' }

  revalidatePath('/admin/ubicaciones')
  return { success: true, data: undefined }
}

export async function desactivarDepartamento(id: string): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('departamento')
    .update({ fecha_baja: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, error: 'No se pudo desactivar.' }
  revalidatePath('/admin/ubicaciones')
  return { success: true, data: undefined }
}

export async function reactivarDepartamento(id: string): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('departamento').update({ fecha_baja: null }).eq('id', id)
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
  const departamentoId = formData.get('departamento_id')?.toString()
  const nombre = formData.get('nombre')?.toString().trim()
  if (!departamentoId) return { success: false, error: 'Seleccioná un departamento primero.' }
  if (!nombre) return { success: false, error: 'Ingresá el nombre de la localidad.' }

  const admin = createAdminClient()
  const { error } = await admin.from('localidad').insert({
    departamento_id: departamentoId,
    nombre,
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
  const { error } = await admin.from('localidad').update({ nombre: limpio }).eq('id', id)
  if (error) return { success: false, error: 'No se pudo actualizar la localidad.' }

  revalidatePath('/admin/ubicaciones')
  return { success: true, data: undefined }
}

export async function desactivarLocalidad(id: string): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('localidad')
    .update({ fecha_baja: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, error: 'No se pudo desactivar.' }
  revalidatePath('/admin/ubicaciones')
  return { success: true, data: undefined }
}

export async function reactivarLocalidad(id: string): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('localidad').update({ fecha_baja: null }).eq('id', id)
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
  const { error } = await admin.from('pregunta_eneagrama')
    .update({ enunciado, eneatipo_asociado })
    .eq('id', id)
  if (error) return { success: false, error: 'No se pudo guardar la pregunta.' }

  revalidatePath('/admin/preguntas')
  return { success: true, data: undefined }
}

export async function eliminarPregunta(id: string): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('pregunta_eneagrama')
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
  const { error } = await admin.from('pregunta_eneagrama')
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
  const { data: nueva, error } = await admin.from('terminos_y_condiciones')
    .insert({ version, descripcion })
    .select('id')
    .single()
  if (error?.code === '23505') return { success: false, error: 'Ya existe una versión con ese número.' }
  if (error || !nueva) return { success: false, error: 'No se pudo publicar la nueva versión.' }

  // 2. Dar de baja las versiones vigentes anteriores (debe quedar una sola vigente)
  await admin.from('terminos_y_condiciones')
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
  const { error } = await admin.from('configuracion_sistema')
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
  const { error } = await admin.from('configuracion_sistema')
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
  const { error } = await admin.from('perfil_postulante')
    .update({ perfil_en_busqueda: false })
    .eq('id', postulanteId)
  if (error) return { success: false, error: 'No se pudo desactivar el perfil.' }
  revalidatePath('/admin/postulantes')
  return { success: true, data: undefined }
}

export async function reactivarPostulante(postulanteId: string): Promise<ActionResult> {
  await requireAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('perfil_postulante')
    .update({ perfil_en_busqueda: true })
    .eq('id', postulanteId)
  if (error) return { success: false, error: 'No se pudo reactivar el perfil.' }
  revalidatePath('/admin/postulantes')
  return { success: true, data: undefined }
}
