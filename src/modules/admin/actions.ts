'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { requireAdmin } from '@/lib/guards'
import { logAuditoria } from '@/lib/logger'
import type { ActionResult } from '@/lib/types/domain'
import { resetearTestsEnProgreso } from '@/modules/eneagrama/service'
import { patronTextoCompleto, normalizarTexto } from '@/lib/texto'
import { marcarCertificadosDesactualizados } from '@/modules/perfil-tecnico/certificado'
import {
  crearSchemaNombreCatalogo,
  schemaNombreCatalogo,
  crearSchemaEnunciadoPregunta,
  schemaEneatipo,
  schemaVersionTyC,
  schemaDescripcionTyC,
} from './schema'

// ─── Sectores ────────────────────────────────────────────────────────────────

export async function crearSector(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin()
  const rawNombre = formData.get('nombre_sector')?.toString() ?? ''
  const parsed = crearSchemaNombreCatalogo('Ingresá un nombre de sector.').safeParse(rawNombre)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const nombre = parsed.data

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
  const rawNombre = formData.get('nombre')?.toString() ?? ''
  const parsed = crearSchemaNombreCatalogo('Ingresá un nombre de competencia.').safeParse(rawNombre)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const nombre = parsed.data

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


/**
 * Aprueba un grupo de sugerencias pendientes en /admin/competencias (H-205).
 *
 * Flujo:
 * 1. Busca en el catálogo una competencia que coincida (con normalizarTexto), activa o no.
 *    - Si existe y está desactivada, la reactiva (fecha_baja = null).
 *    - Si no existe, la crea con el nombre representativo.
 * 2. Para cada sugerencia del grupo, inserta en postulante_competencia con su nivel
 *    (ignora duplicados si ya existía la relación por la constraint única).
 * 3. Borra las sugerencias del grupo en competencia_sugerida.
 * 4. Marca como desactualizado el certificado de cada postulante afectado.
 * 5. Registra logAuditoria y revalida /admin/competencias.
 *
 * Este orden hace que la operación sea idempotente y se pueda repetir sin
 * problema si falla a mitad de camino.
 */
export async function aprobarSugerencia(nombreNormalizado: string): Promise<ActionResult> {
  const session = await requireAdmin()
  const admin = createAdminClient()

  // 1. Obtener todas las sugerencias de este grupo
  const { data: sugerencias, error: sugErr } = await admin
    .from('competencia_sugerida')
    .select('id, perfil_tecnico_id, nombre, nivel')
    .eq('nombre_normalizado', nombreNormalizado)

  if (sugErr) return { success: false, error: 'No se pudieron leer las sugerencias.' }
  if (!sugerencias || sugerencias.length === 0) {
    return { success: false, error: 'No se encontraron sugerencias pendientes para este grupo.' }
  }

  // Determinar nombre representativo (el más frecuente o el primero)
  const freqs = new Map<string, number>()
  for (const s of sugerencias) {
    freqs.set(s.nombre, (freqs.get(s.nombre) ?? 0) + 1)
  }
  let nombreRep = sugerencias[0].nombre
  let maxFreq = 0
  for (const [n, f] of freqs.entries()) {
    if (f > maxFreq) {
      maxFreq = f
      nombreRep = n
    }
  }

  // Buscar en el catálogo una competencia que coincida (esté activa o no)
  const { data: catalogo, error: catErr } = await admin
    .from('competencia')
    .select('id, nombre, fecha_baja')

  if (catErr) return { success: false, error: 'Error al consultar el catálogo.' }

  const match = (catalogo ?? []).find((c) => normalizarTexto(c.nombre) === nombreNormalizado)

  let competenciaId: string
  if (match) {
    competenciaId = match.id
    if (match.fecha_baja !== null) {
      const { error: reactivarErr } = await admin
        .from('competencia')
        .update({ fecha_baja: null })
        .eq('id', match.id)
      if (reactivarErr) return { success: false, error: 'No se pudo reactivar la competencia.' }
    }
  } else {
    const { data: creada, error: crearErr } = await admin
      .from('competencia')
      .insert({ nombre: nombreRep })
      .select('id')
      .single()

    if (crearErr) {
      if (crearErr.code === '23505') {
        const { data: existente } = await admin
          .from('competencia')
          .select('id')
          .eq('nombre', nombreRep)
          .maybeSingle()
        if (!existente) return { success: false, error: 'Error de concurrencia al crear la competencia.' }
        competenciaId = existente.id
      } else {
        return { success: false, error: 'No se pudo crear la competencia en el catálogo.' }
      }
    } else {
      competenciaId = creada.id
    }
  }

  // 2. Insertar en postulante_competencia con su nivel
  const pcRows = sugerencias.map((s) => ({
    perfil_tecnico_id: s.perfil_tecnico_id,
    competencia_id: competenciaId,
    nivel: s.nivel,
  }))

  const { error: upsertErr } = await admin
    .from('postulante_competencia')
    .upsert(pcRows, { onConflict: 'perfil_tecnico_id,competencia_id', ignoreDuplicates: true })

  if (upsertErr) return { success: false, error: 'No se pudieron asignar las competencias a los postulantes.' }

  // 3. Borrar las sugerencias procesadas. Se borran por id, no por grupo: una
  // sugerencia que llegue mientras tanto queda pendiente en vez de perderse sin
  // haber sido asignada.
  const { error: delErr } = await admin
    .from('competencia_sugerida')
    .delete()
    .in('id', sugerencias.map((s) => s.id))

  if (delErr) return { success: false, error: 'No se pudieron borrar las sugerencias procesadas.' }

  // 4. Marcar como desactualizado el certificado de cada postulante afectado
  const ptIds = [...new Set(sugerencias.map((s) => s.perfil_tecnico_id))]
  const { data: pts } = await admin
    .from('perfil_tecnico')
    .select('postulante_id')
    .in('id', ptIds)

  const postulanteIds = (pts ?? []).map((p) => p.postulante_id).filter(Boolean) as string[]
  if (postulanteIds.length > 0) {
    await marcarCertificadosDesactualizados(postulanteIds)
  }

  // 5. Registrar auditoría y revalidar
  logAuditoria({
    usuarioId: session.id,
    accion: 'aprobar_competencia_sugerida',
    entidad: 'competencia_sugerida',
    entidadId: competenciaId,
    detalle: {
      nombreNormalizado,
      competenciaId,
      nombre: match ? match.nombre : nombreRep,
      reactivada: !!match && match.fecha_baja !== null,
      cantidadPostulantes: postulanteIds.length,
    },
  })

  revalidatePath('/admin/competencias')
  return { success: true, data: undefined }
}

/**
 * Descarta un grupo de sugerencias pendientes (H-205).
 * Borra las sugerencias del grupo, llama a logAuditoria y revalida la vista.
 */
export async function descartarSugerencia(nombreNormalizado: string): Promise<ActionResult> {
  const session = await requireAdmin()
  const admin = createAdminClient()

  const { error } = await admin
    .from('competencia_sugerida')
    .delete()
    .eq('nombre_normalizado', nombreNormalizado)

  if (error) return { success: false, error: 'No se pudieron descartar las sugerencias.' }

  logAuditoria({
    usuarioId: session.id,
    accion: 'descartar_competencia_sugerida',
    entidad: 'competencia_sugerida',
    entidadId: nombreNormalizado,
    detalle: { nombreNormalizado },
  })

  revalidatePath('/admin/competencias')
  return { success: true, data: undefined }
}

// ─── Idiomas ─────────────────────────────────────────────────────────────────

export async function crearIdioma(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin()
  const rawNombre = formData.get('nombre')?.toString() ?? ''
  const parsed = crearSchemaNombreCatalogo('Ingresá un nombre de idioma.').safeParse(rawNombre)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const nombre = parsed.data

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
  const rawNombre = formData.get('nombre')?.toString() ?? ''
  const parsed = crearSchemaNombreCatalogo('Ingresá el nombre de la carrera.').safeParse(rawNombre)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const nombre = parsed.data

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
  const parsed = schemaNombreCatalogo.safeParse(nuevoNombre)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const limpio = parsed.data

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
  const parsedOriginal = crearSchemaNombreCatalogo('Nombre inválido.').safeParse(textoLibre)
  if (!parsedOriginal.success) return { success: false, error: parsedOriginal.error.issues[0].message }
  const original = parsedOriginal.data

  const parsedOficial = crearSchemaNombreCatalogo('Nombre inválido.').safeParse(nombreOficial ?? textoLibre)
  if (!parsedOficial.success) return { success: false, error: parsedOficial.error.issues[0].message }
  const oficial = parsedOficial.data

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
  const rawNombre = formData.get('nombre')?.toString() ?? ''
  const parsed = crearSchemaNombreCatalogo('Ingresá el nombre de la provincia.').safeParse(rawNombre)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const nombre = parsed.data

  const admin = createAdminClient()
  const { error } = await admin.from('provincia').insert({ nombre })
  if (error?.code === '23505') return { success: false, error: 'Ya existe una provincia con ese nombre.' }
  if (error) return { success: false, error: 'No se pudo crear la provincia.' }

  revalidatePath('/admin/ubicaciones')
  return { success: true, data: undefined }
}

export async function renombrarProvincia(id: string, nombre: string): Promise<ActionResult> {
  await requireAdmin()
  const parsed = schemaNombreCatalogo.safeParse(nombre)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const limpio = parsed.data

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
  if (!provinciaId) return { success: false, error: 'Seleccioná una provincia primero.' }

  const rawNombre = formData.get('nombre')?.toString() ?? ''
  const parsed = crearSchemaNombreCatalogo('Ingresá el nombre del departamento.').safeParse(rawNombre)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const nombre = parsed.data

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
  const parsed = schemaNombreCatalogo.safeParse(nombre)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const limpio = parsed.data

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
  if (!departamentoId) return { success: false, error: 'Seleccioná un departamento primero.' }

  const rawNombre = formData.get('nombre')?.toString() ?? ''
  const parsed = crearSchemaNombreCatalogo('Ingresá el nombre de la localidad.').safeParse(rawNombre)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const nombre = parsed.data

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
  const parsed = schemaNombreCatalogo.safeParse(nombre)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }
  const limpio = parsed.data

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
  if (!id) return { success: false, error: 'Datos incompletos.' }

  const rawEnunciado = formData.get('enunciado')?.toString() ?? ''
  const parsedEnunciado = crearSchemaEnunciadoPregunta('Datos incompletos.').safeParse(rawEnunciado)
  if (!parsedEnunciado.success) {
    return { success: false, error: parsedEnunciado.error.issues[0].message }
  }
  const enunciado = parsedEnunciado.data

  const rawEneatipo = Number(formData.get('eneatipo_asociado'))
  const parsedEneatipo = schemaEneatipo.safeParse(rawEneatipo)
  if (!parsedEneatipo.success) {
    return { success: false, error: 'Eneatipo debe ser entre 1 y 9.' }
  }
  const eneatipo_asociado = parsedEneatipo.data

  const admin = createAdminClient()
  const { error } = await admin.from('pregunta_eneagrama')
    .update({ enunciado, eneatipo_asociado })
    .eq('id', id)
  if (error) return { success: false, error: 'No se pudo guardar la pregunta.' }

  revalidatePath('/admin/preguntas')
  return { success: true, data: undefined }
}

export async function eliminarPregunta(id: string): Promise<ActionResult> {
  const session = await requireAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('pregunta_eneagrama')
    .update({ fecha_baja: new Date().toISOString() })
    .eq('id', id)
  if (error) return { success: false, error: 'No se pudo eliminar la pregunta.' }
  logAuditoria({
    usuarioId: session.id,
    accion: 'eliminar_pregunta_eneagrama',
    entidad: 'pregunta_eneagrama',
    entidadId: id,
  })
  await resetearTestsEnProgreso()
  revalidatePath('/admin/preguntas')
  return { success: true, data: undefined }
}

export async function togglePausarPregunta(id: string, pausada: boolean): Promise<ActionResult> {
  const session = await requireAdmin()
  const admin = createAdminClient()
  const { error } = await admin.from('pregunta_eneagrama')
    .update({ pausada })
    .eq('id', id)
  if (error) return { success: false, error: 'No se pudo cambiar el estado.' }
  logAuditoria({
    usuarioId: session.id,
    accion: pausada ? 'pausar_pregunta_eneagrama' : 'reanudar_pregunta_eneagrama',
    entidad: 'pregunta_eneagrama',
    entidadId: id,
    detalle: { pausada },
  })
  await resetearTestsEnProgreso()
  revalidatePath('/admin/preguntas')
  return { success: true, data: undefined }
}

// ─── Términos y Condiciones ──────────────────────────────────────────────────

export async function publicarTyC(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireAdmin()
  const rawVersion = formData.get('version')?.toString() ?? ''
  const rawDescripcion = formData.get('descripcion')?.toString() ?? ''

  const parsedVersion = schemaVersionTyC.safeParse(rawVersion)
  if (!parsedVersion.success) {
    return { success: false, error: parsedVersion.error.issues[0].message }
  }
  const version = parsedVersion.data

  const parsedDescripcion = schemaDescripcionTyC.safeParse(rawDescripcion)
  if (!parsedDescripcion.success) {
    return { success: false, error: parsedDescripcion.error.issues[0].message }
  }
  const descripcion = parsedDescripcion.data

  const admin = createAdminClient()

  // 1. Insertar la nueva versión (queda vigente: fecha_baja_tyc = null)
  const { data: nueva, error } = await admin.from('terminos_y_condiciones')
    .insert({ version, descripcion })
    .select('id')
    .single()
  if (error?.code === '23505') return { success: false, error: 'Ya existe una versión con ese número.' }
  if (error || !nueva) return { success: false, error: 'No se pudo publicar la nueva versión.' }

  // 2. Dar de baja las versiones vigentes anteriores (debe quedar una sola vigente)
  const { error: errorBaja } = await admin.from('terminos_y_condiciones')
    .update({ fecha_baja_tyc: new Date().toISOString() })
    .is('fecha_baja_tyc', null)
    .neq('id', (nueva as { id: string }).id)

  // Recargar el layout raíz para que el gate de TyC vuelva a evaluarse en todos los usuarios
  revalidatePath('/admin/tyc')
  revalidatePath('/', 'layout')

  // La versión nueva ya quedó publicada aunque falle la baja de las anteriores.
  logAuditoria({
    usuarioId: session.id,
    accion: 'publicar_tyc',
    entidad: 'terminos_y_condiciones',
    entidadId: (nueva as { id: string }).id,
    detalle: { version },
  })

  if (errorBaja) {
    console.error('[publicarTyC] Error al dar de baja versiones anteriores:', errorBaja)
    return {
      success: false,
      error: 'Se publicó la nueva versión, pero no se pudieron dar de baja las anteriores. Avisale al equipo.',
    }
  }

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
  const session = await requireAdmin()
  const dias = Number(formData.get('dias'))
  if (!Number.isInteger(dias) || dias < 1 || dias > 3650) {
    return { success: false, error: 'Ingresá un número entero de días entre 1 y 3650.' }
  }

  const admin = createAdminClient()
  const { error } = await admin.from('configuracion_sistema')
    .update({ dias_inactividad_cierre: dias, updated_at: new Date().toISOString() })
    .eq('id', true)
  if (error) return { success: false, error: 'No se pudo actualizar la configuración.' }

  logAuditoria({
    usuarioId: session.id,
    accion: 'actualizar_dias_inactividad',
    entidad: 'configuracion_sistema',
    entidadId: 'global',
    detalle: { dias },
  })

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
  const session = await requireAdmin()
  const dias = Number(formData.get('dias'))
  if (!Number.isInteger(dias) || dias < 1 || dias > 3650) {
    return { success: false, error: 'Ingresá un número entero de días entre 1 y 3650.' }
  }

  const admin = createAdminClient()
  const { error } = await admin.from('configuracion_sistema')
    .update({ dias_reactivar_feedback: dias, updated_at: new Date().toISOString() })
    .eq('id', true)
  if (error) return { success: false, error: 'No se pudo actualizar la configuración.' }

  logAuditoria({
    usuarioId: session.id,
    accion: 'actualizar_dias_reactivar_feedback',
    entidad: 'configuracion_sistema',
    entidadId: 'global',
    detalle: { dias },
  })

  revalidatePath('/admin/feedback')
  revalidatePath('/postulante/informe')
  return { success: true, data: undefined }
}

// ─── Moderación postulantes ──────────────────────────────────────────────────

export async function desactivarPostulante(postulanteId: string): Promise<ActionResult> {
  const session = await requireAdmin()
  const admin = createAdminClient()
  const { data, error } = await admin.from('perfil_postulante')
    .update({ bloqueado_por_admin: true })
    .eq('id', postulanteId)
    .select('id')
  if (error) return { success: false, error: 'No se pudo desactivar el perfil.' }
  if (!data || data.length === 0) return { success: false, error: 'Postulante no encontrado.' }

  logAuditoria({
    usuarioId: session.id,
    accion: 'desactivar_postulante',
    entidad: 'perfil_postulante',
    entidadId: postulanteId,
  })

  revalidatePath('/admin/postulantes')
  return { success: true, data: undefined }
}

export async function reactivarPostulante(postulanteId: string): Promise<ActionResult> {
  const session = await requireAdmin()
  const admin = createAdminClient()
  const { data, error } = await admin.from('perfil_postulante')
    .update({ bloqueado_por_admin: false })
    .eq('id', postulanteId)
    .select('id')
  if (error) return { success: false, error: 'No se pudo reactivar el perfil.' }
  if (!data || data.length === 0) return { success: false, error: 'Postulante no encontrado.' }

  logAuditoria({
    usuarioId: session.id,
    accion: 'reactivar_postulante',
    entidad: 'perfil_postulante',
    entidadId: postulanteId,
  })

  revalidatePath('/admin/postulantes')
  return { success: true, data: undefined }
}
