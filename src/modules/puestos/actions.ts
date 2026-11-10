'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { getReclutadorId } from '@/modules/empresas/queries'
import { puestoSchema } from './schema'
import type { ActionResult } from '@/lib/types/domain'
import type { TablesInsert } from '@/lib/types/database.types'
import { parseFormularioPreselectorField } from '@/modules/preselector/schema'
import { persistirFormularioPreselector, eliminarFormularioPreselector } from '@/modules/preselector/service'
import { marcarActividadPuesto } from './actividad'
import { getCicloMasReciente } from './ciclos'
import { isUuid } from '@/lib/utils'
import { logAuditoria } from '@/lib/logger'
import { ESTADO_POSTULACION } from '@/lib/constants/enums'

/**
 * Contratación opcional al cerrar/eliminar un puesto.
 * - `plataforma`: la persona contratada es un postulante del sistema (relación real).
 * - `externo`: se contrató por fuera; solo guardamos el nombre libre.
 */
export type ContratacionInput =
  | { tipo: 'plataforma'; postulanteId: string }
  | { tipo: 'externo'; nombre: string }

const MAX_CARRERAS_POR_PUESTO = 10

/**
 * Lee el <input hidden name="carrera_ids"> (JSON de ids) que arma el multi-select
 * de carreras. Descarta valores que no sean UUID, deduplica y limita la cantidad.
 */
function parseCarreraIds(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== 'string' || raw === '') return []
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return []
    const validas = arr.filter((v): v is string => typeof v === 'string' && isUuid(v))
    return Array.from(new Set(validas)).slice(0, MAX_CARRERAS_POR_PUESTO)
  } catch {
    return []
  }
}

// Helper: get reclutador_id for the current user
async function getReclutadorContext(): Promise<{ reclutadorId: string } | null> {
  const reclutadorId = await getReclutadorId()
  return reclutadorId ? { reclutadorId } : null
}

/** Revalida de forma simétrica las vistas de reclutador y postulante afectadas por un puesto (H-103, H-223). */
function revalidarPuesto(puestoId: string) {
  revalidatePath('/reclutador/puestos')
  revalidatePath(`/reclutador/puestos/${puestoId}`)
  revalidatePath('/reclutador/postulaciones')
  revalidatePath('/postulante/puestos')
  revalidatePath('/postulante/postulaciones')
}

/** El puesto existe y es del reclutador (las acciones con service role no tienen RLS). */
async function esPuestoPropio(
  admin: ReturnType<typeof createAdminClient>,
  puestoId: string,
  reclutadorId: string,
): Promise<boolean> {
  const { data } = await admin
    .from('puesto')
    .select('id')
    .eq('id', puestoId)
    .eq('reclutador_id', reclutadorId)
    .maybeSingle()
  return !!data
}

/**
 * La empresa del puesto la elige el reclutador en el formulario: hay que probar
 * que sea una de las suyas antes de guardarla (el insert va con service role).
 * Al publicar solo valen las empresas activas; al editar se acepta también una
 * dada de baja para no bloquear la edición de puestos históricos.
 */
async function empresaHabilitada(
  reclutadorId: string,
  empresaId: string,
  opciones: { permitirBaja: boolean },
): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('reclutador_empresa')
    .select('empresa(id, fecha_baja)')
    .eq('reclutador_id', reclutadorId)
    .eq('empresa_id', empresaId)
    .maybeSingle()

  if (!data) return false
  const empresa = (data as { empresa: { fecha_baja: string | null } | null }).empresa
  if (!empresa) return false
  return opciones.permitirBaja || !empresa.fecha_baja
}

// Register opening in historial_puesto and check analytics alert
async function registrarApertura(puestoId: string, empresaId: string, tituloPuesto: string) {
  const admin = createAdminClient()

  const { error: aperturaError } = await admin.from('historial_puesto').insert({
    puesto_id: puestoId,
    fecha_inicio: new Date().toISOString(),
  })
  if (aperturaError) {
    console.error('[puestos/actions] Error al registrar apertura en historial_puesto:', aperturaError)
  }

  // Analytics alert: ≥3 openings of the same title in the last year
  const unAñoAtras = new Date()
  unAñoAtras.setFullYear(unAñoAtras.getFullYear() - 1)

  // The company filter runs in SQL so only this company's openings are fetched.
  // The title stays compared in JS: an ilike would treat % _ * in the title as wildcards.
  const { data: historiales } = await admin
    .from('historial_puesto')
    .select('id, puesto!inner(titulo_puesto)')
    .eq('puesto.empresa_id', empresaId)
    .gte('fecha_inicio', unAñoAtras.toISOString())

  if (historiales) {
    const aperturasEmpresa = (historiales as unknown[]).filter((h) => {
      const row = h as { puesto: { titulo_puesto: string } | null }
      return row.puesto?.titulo_puesto?.toLowerCase() === tituloPuesto.toLowerCase()
    })
    if (aperturasEmpresa.length >= 3) {
      console.warn(
        `[alerta-analitica] La empresa ${empresaId} reabrió "${tituloPuesto}" ` +
        `${aperturasEmpresa.length} veces en el último año. Posible problema de clima/perfilado.`
      )
    }
  }
}

/**
 * Registra la contratación en el último CICLO del puesto (historial_puesto).
 * Debe llamarse ANTES de cerrar el ciclo.
 *
 * Usa el ciclo más reciente y no el abierto: al eliminar un puesto que ya estaba
 * cerrado, la contratación pertenece a su último ciclo. Crear uno nuevo lo contaría
 * como reapertura y ensuciaría la analítica.
 */
async function registrarContratacion(
  admin: ReturnType<typeof createAdminClient>,
  puestoId: string,
  contratacion: ContratacionInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let historialId = await getCicloMasReciente(puestoId)

  // Edge: puesto sin ningún ciclo → crear uno para no perder la contratación.
  if (!historialId) {
    const { data: nuevo, error } = await admin.from('historial_puesto')
      .insert({ puesto_id: puestoId })
      .select('id')
      .single()
    if (error || !nuevo) return { ok: false, error: 'No se pudo registrar el ciclo del puesto.' }
    historialId = (nuevo as { id: string }).id
  }

  // Validaciones de entrada. El nombre externo es opcional; el postulante NO.
  if (contratacion.tipo === 'plataforma') {
    if (!contratacion.postulanteId) {
      return { ok: false, error: 'Elegí el postulante contratado.' }
    }
    // Tiene que haber aplicado al ciclo que estamos cerrando, no a uno anterior.
    // Un mismo postulante puede tener una postulación por ciclo, así que el filtro
    // por ciclo es también lo que garantiza una única fila.
    const { data: aplico } = await admin
      .from('postulacion')
      .select('id')
      .eq('historial_puesto_id', historialId)
      .eq('postulante_id', contratacion.postulanteId)
      .maybeSingle()
    if (!aplico) {
      return { ok: false, error: 'El postulante seleccionado no aplicó a este puesto.' }
    }
  }

  // Anotado a mano: el ternario produce una unión de dos formas distintas y el
  // insert de supabase-js la resuelve contra la primera rama en vez de aceptar
  // las dos. La fila es una sola: o postulante de la plataforma, o nombre suelto.
  const row: TablesInsert<'contratacion'> =
    contratacion.tipo === 'plataforma'
      ? { historial_puesto_id: historialId, postulante_id: contratacion.postulanteId, nombre_externo: null }
      : { historial_puesto_id: historialId, postulante_id: null, nombre_externo: contratacion.nombre.trim() || null }

  // Upsert: contratacion es UNIQUE por ciclo y el reclutador puede registrarla dos
  // veces sobre el mismo (cerrar y después eliminar). La última respuesta gana.
  const { error } = await admin.from('contratacion')
    .upsert(row, { onConflict: 'historial_puesto_id' })
  if (error) return { ok: false, error: 'No se pudo registrar la contratación.' }
  return { ok: true }
}

/**
 * Postulantes que aplicaron al ciclo vigente del puesto, para el selector
 * "contraté a alguien de la plataforma". Solo accesible por el reclutador dueño.
 *
 * Se limita al ciclo actual porque es contra ese ciclo que registrarContratacion
 * valida: ofrecer candidatos de reaperturas anteriores sería ofrecer opciones que
 * después rebotan.
 */
export async function getPostulantesDePuesto(
  puestoId: string,
): Promise<ActionResult<{ postulanteId: string; nombre: string }[]>> {
  const ctx = await getReclutadorContext()
  if (!ctx) return { success: false, error: 'No autorizado.' }

  const admin = createAdminClient()

  // Verificar propiedad del puesto
  const { data: puesto, error: puestoError } = await admin
    .from('puesto')
    .select('id')
    .eq('id', puestoId)
    .eq('reclutador_id', ctx.reclutadorId)
    .maybeSingle()

  if (puestoError) {
    console.error('[puestos/actions] Error al verificar puesto en getPostulantesDePuesto:', puestoError)
    return { success: false, error: 'No se pudo verificar el puesto.' }
  }
  if (!puesto) return { success: false, error: 'No autorizado.' }

  const cicloId = await getCicloMasReciente(puestoId)
  if (!cicloId) return { success: true, data: [] }

  const { data, error } = await admin
    .from('postulacion')
    .select('postulante_id, perfil_postulante(nombre_completo)')
    .eq('historial_puesto_id', cicloId)
    .order('fecha_postulacion', { ascending: false })

  if (error) {
    console.error('[puestos/actions] Error al obtener postulantes del puesto:', error)
    return { success: false, error: 'No se pudieron cargar los postulantes.' }
  }

  const seen = new Set<string>()
  const out: { postulanteId: string; nombre: string }[] = []
  for (const row of (data ?? []) as unknown[]) {
    const r = row as { postulante_id: string; perfil_postulante: { nombre_completo: string } | null }
    if (seen.has(r.postulante_id)) continue
    seen.add(r.postulante_id)
    out.push({ postulanteId: r.postulante_id, nombre: r.perfil_postulante?.nombre_completo ?? 'Sin nombre' })
  }
  return { success: true, data: out }
}

export async function publicarPuesto(
  _prevState: ActionResult<{ puestoId: string }>,
  formData: FormData
): Promise<ActionResult<{ puestoId: string }>> {
  const ctx = await getReclutadorContext()
  if (!ctx) return { success: false, error: 'Completá el onboarding de empresa antes de publicar puestos.' }

  const parsed = puestoSchema.safeParse({
    empresa_id: formData.get('empresa_id'),
    titulo_puesto: formData.get('titulo_puesto'),
    descripcion_texto: formData.get('descripcion_texto') || undefined,
    sector_id: formData.get('sector_id') || undefined,
    idioma: formData.get('idioma') || undefined,
    carga_horaria: formData.get('carga_horaria'),
    ubicacion: formData.get('ubicacion'),
    departamento_id: formData.get('departamento_id') || undefined,
    localidad_id: formData.get('localidad_id') || undefined,
    nivel_experiencia: formData.get('nivel_experiencia') || undefined,
    perfil_psicologico_deseado: formData.get('perfil_psicologico_deseado') || undefined,
  })

  if (!parsed.success) {
    return {
      success: false,
      error: 'Revisá los campos del formulario.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  if (!(await empresaHabilitada(ctx.reclutadorId, parsed.data.empresa_id, { permitirBaja: false }))) {
    return {
      success: false,
      error: 'Revisá los campos del formulario.',
      fieldErrors: { empresa_id: ['Elegí una de tus empresas activas.'] },
    }
  }

  const formulario = parseFormularioPreselectorField(formData.get('formulario_preselector'))
  if (formulario.kind === 'invalid') {
    return {
      success: false,
      error: formulario.error,
      fieldErrors: formulario.fieldErrors ?? { formulario_preselector: [formulario.error] },
    }
  }

  const carreraIds = parseCarreraIds(formData.get('carrera_ids'))

  // Modalidad remota → sin ubicación geográfica.
  const esRemoto = parsed.data.ubicacion === 'REMOTO'

  const admin = createAdminClient()
  const puestoId = crypto.randomUUID()

  const { error } = await admin.from('puesto').insert({
    id: puestoId,
    reclutador_id: ctx.reclutadorId,
    ...parsed.data,
    idioma: parsed.data.idioma || '',
    sector_id: parsed.data.sector_id || null,
    departamento_id: esRemoto ? null : parsed.data.departamento_id || null,
    localidad_id: esRemoto ? null : parsed.data.localidad_id || null,
    activo: true,
  })

  if (error) return { success: false, error: 'No se pudo publicar el puesto.' }

  if (carreraIds.length > 0) {
    const { error: carrerasError } = await admin.from('puesto_carrera')
      .insert(carreraIds.map((carreraId) => ({ puesto_id: puestoId, carrera_id: carreraId })))
    if (carrerasError) return { success: false, error: 'No se pudieron guardar las carreras del puesto.' }
  }

  if (formulario.kind === 'valid') {
    const resultado = await persistirFormularioPreselector(admin, puestoId, formulario.data)
    if (!resultado.ok) return { success: false, error: resultado.error }
  }

  await registrarApertura(puestoId, parsed.data.empresa_id, parsed.data.titulo_puesto)
  logAuditoria({
    usuarioId: ctx.reclutadorId,
    accion: 'publicar_puesto',
    entidad: 'puesto',
    entidadId: puestoId,
  })

  revalidarPuesto(puestoId)
  // No redirigimos: el cliente muestra el modal de advertencia (cierre por
  // inactividad) y navega al puesto cuando el reclutador lo confirma.
  return { success: true, data: { puestoId } }
}

export async function editarPuesto(
  puestoId: string,
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const ctx = await getReclutadorContext()
  if (!ctx) return { success: false, error: 'No autorizado.' }

  const parsed = puestoSchema.safeParse({
    empresa_id: formData.get('empresa_id'),
    titulo_puesto: formData.get('titulo_puesto'),
    descripcion_texto: formData.get('descripcion_texto') || undefined,
    sector_id: formData.get('sector_id') || undefined,
    idioma: formData.get('idioma') || undefined,
    carga_horaria: formData.get('carga_horaria'),
    ubicacion: formData.get('ubicacion'),
    departamento_id: formData.get('departamento_id') || undefined,
    localidad_id: formData.get('localidad_id') || undefined,
    nivel_experiencia: formData.get('nivel_experiencia') || undefined,
    perfil_psicologico_deseado: formData.get('perfil_psicologico_deseado') || undefined,
  })

  if (!parsed.success) {
    return {
      success: false,
      error: 'Revisá los campos.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  // Al editar se acepta una empresa dada de baja: puede ser la del propio puesto.
  if (!(await empresaHabilitada(ctx.reclutadorId, parsed.data.empresa_id, { permitirBaja: true }))) {
    return {
      success: false,
      error: 'Revisá los campos.',
      fieldErrors: { empresa_id: ['Elegí una de tus empresas.'] },
    }
  }

  const formulario = parseFormularioPreselectorField(formData.get('formulario_preselector'))
  if (formulario.kind === 'invalid') {
    return {
      success: false,
      error: formulario.error,
      fieldErrors: formulario.fieldErrors ?? { formulario_preselector: [formulario.error] },
    }
  }

  const carreraIds = parseCarreraIds(formData.get('carrera_ids'))
  const esRemoto = parsed.data.ubicacion === 'REMOTO'

  const supabase = await createClient()
  const { data: actualizados, error } = await supabase.from('puesto')
    .update({
      ...parsed.data,
      idioma: parsed.data.idioma || '',
      sector_id: parsed.data.sector_id || null,
      departamento_id: esRemoto ? null : parsed.data.departamento_id || null,
      localidad_id: esRemoto ? null : parsed.data.localidad_id || null,
    })
    .eq('id', puestoId)
    .eq('reclutador_id', ctx.reclutadorId)
    .select('id')

  if (error) return { success: false, error: 'No se pudo actualizar el puesto.' }
  // Zero matched rows means the puesto belongs to another recruiter (or does not
  // exist); the admin-client form persistence below bypasses RLS, so ownership
  // must be proven here before touching the formulario.
  if (!actualizados || actualizados.length === 0) {
    return { success: false, error: 'No autorizado.' }
  }

  // Sincronizar carreras del puesto (reemplazo completo). Se hace con el service
  // role; la propiedad del puesto ya quedó probada arriba.
  {
    const admin = createAdminClient()
    await admin.from('puesto_carrera').delete().eq('puesto_id', puestoId)
    if (carreraIds.length > 0) {
      const { error: carrerasError } = await admin.from('puesto_carrera')
        .insert(carreraIds.map((carreraId) => ({ puesto_id: puestoId, carrera_id: carreraId })))
      if (carrerasError) return { success: false, error: 'No se pudieron guardar las carreras del puesto.' }
    }
  }

  if (formulario.kind === 'valid') {
    const admin = createAdminClient()
    const resultado = await persistirFormularioPreselector(admin, puestoId, formulario.data)
    if (!resultado.ok) return { success: false, error: resultado.error }
  } else if (formulario.kind === 'empty') {
    const admin = createAdminClient()
    const resultado = await eliminarFormularioPreselector(admin, puestoId)
    if (!resultado.ok) return { success: false, error: resultado.error }
  }

  // Editar el puesto cuenta como actividad del reclutador.
  await marcarActividadPuesto(puestoId)

  revalidarPuesto(puestoId)
  // El form sigue montado tras guardar: refrescar /editar actualiza el formulario
  // de referencia del editor del preselector, que decide si hay cambios que enviar.
  logAuditoria({
    usuarioId: ctx.reclutadorId,
    accion: 'editar_puesto',
    entidad: 'puesto',
    entidadId: puestoId,
  })
  revalidatePath(`/reclutador/puestos/${puestoId}/editar`)
  return { success: true, data: undefined }
}

export async function cerrarPuesto(
  puestoId: string,
  contratacion?: ContratacionInput | null,
): Promise<ActionResult> {
  const ctx = await getReclutadorContext()
  if (!ctx) return { success: false, error: 'No autorizado.' }

  const admin = createAdminClient()

  // Todo lo que sigue va con service role y filtra solo por puesto_id: la
  // pertenencia se prueba antes de la primera escritura.
  if (!(await esPuestoPropio(admin, puestoId, ctx.reclutadorId))) {
    return { success: false, error: 'No autorizado.' }
  }

  // 1. Registrar contratación (si la hubo) sobre el ciclo abierto, antes de cerrarlo.
  if (contratacion) {
    const res = await registrarContratacion(admin, puestoId, contratacion)
    if (!res.ok) return { success: false, error: res.error }
  }

  // 2. Cascada: cerrar ciclo activo en historial_puesto
  const { error: historialError } = await admin.from('historial_puesto')
    .update({ fecha_fin: new Date().toISOString() })
    .eq('puesto_id', puestoId)
    .is('fecha_fin', null)

  if (historialError) {
    console.error('[puestos/actions] Error al cerrar historial_puesto en cerrarPuesto:', historialError)
    return {
      success: false,
      error: 'No se pudo cerrar el ciclo del puesto. Podés reintentar la operación.',
    }
  }

  // 3. Cascada: ENVIADA/VISTO applications → CERRADA
  const { error: postulacionError } = await admin.from('postulacion')
    .update({ estado: ESTADO_POSTULACION.CERRADA })
    .eq('puesto_id', puestoId)
    .in('estado', [ESTADO_POSTULACION.ENVIADA, ESTADO_POSTULACION.VISTO])

  if (postulacionError) {
    console.error('[puestos/actions] Error al cerrar postulaciones en cerrarPuesto:', postulacionError)
    revalidarPuesto(puestoId)
    return {
      success: false,
      error: 'No se pudieron cerrar las postulaciones asociadas. Podés reintentar la operación.',
    }
  }

  // 4. AL FINAL: Cierre visible del puesto (activo: false). Si algo falló antes,
  // el puesto sigue activo en la UI permitiendo el reintento.
  const { error: puestoError } = await admin.from('puesto')
    .update({ activo: false })
    .eq('id', puestoId)
    .eq('reclutador_id', ctx.reclutadorId)

  if (puestoError) {
    console.error('[puestos/actions] Error al desactivar puesto en cerrarPuesto:', puestoError)
    revalidarPuesto(puestoId)
    return {
      success: false,
      error: 'No se pudo cerrar el puesto. Podés reintentar la operación.',
    }
  }

  logAuditoria({
    usuarioId: ctx.reclutadorId,
    accion: 'cerrar_puesto',
    entidad: 'puesto',
    entidadId: puestoId,
  })

  revalidarPuesto(puestoId)
  return { success: true, data: undefined }
}

export async function eliminarPuesto(
  puestoId: string,
  contratacion?: ContratacionInput | null,
): Promise<ActionResult> {
  const ctx = await getReclutadorContext()
  if (!ctx) return { success: false, error: 'No autorizado.' }

  const admin = createAdminClient()

  // Ver cerrarPuesto: la pertenencia se prueba antes de la primera escritura.
  if (!(await esPuestoPropio(admin, puestoId, ctx.reclutadorId))) {
    return { success: false, error: 'No autorizado.' }
  }

  // 1. Registrar contratación (si la hubo) sobre el ciclo abierto, antes de cerrarlo.
  if (contratacion) {
    const res = await registrarContratacion(admin, puestoId, contratacion)
    if (!res.ok) return { success: false, error: res.error }
  }

  // 2. Cascada: cerrar ciclo activo en historial_puesto
  const { error: historialError } = await admin.from('historial_puesto')
    .update({ fecha_fin: new Date().toISOString() })
    .eq('puesto_id', puestoId)
    .is('fecha_fin', null)

  if (historialError) {
    console.error('[puestos/actions] Error al cerrar historial_puesto en eliminarPuesto:', historialError)
    return {
      success: false,
      error: 'No se pudo cerrar el ciclo del puesto. Podés reintentar la operación.',
    }
  }

  // 3. Cascada: ENVIADA/VISTO applications → CERRADA
  const { error: postulacionError } = await admin.from('postulacion')
    .update({ estado: ESTADO_POSTULACION.CERRADA })
    .eq('puesto_id', puestoId)
    .in('estado', [ESTADO_POSTULACION.ENVIADA, ESTADO_POSTULACION.VISTO])

  if (postulacionError) {
    console.error('[puestos/actions] Error al cerrar postulaciones en eliminarPuesto:', postulacionError)
    revalidarPuesto(puestoId)
    return {
      success: false,
      error: 'No se pudieron cerrar las postulaciones asociadas. Podés reintentar la operación.',
    }
  }

  // 4. AL FINAL: Baja lógica visible (activo: false, fecha_baja_puesto: now).
  // Si algo falló antes, el puesto sigue visible permitiendo el reintento.
  const { error: puestoError } = await admin.from('puesto')
    .update({ activo: false, fecha_baja_puesto: new Date().toISOString() })
    .eq('id', puestoId)
    .eq('reclutador_id', ctx.reclutadorId)

  if (puestoError) {
    console.error('[puestos/actions] Error al dar de baja el puesto en eliminarPuesto:', puestoError)
    revalidarPuesto(puestoId)
    return {
      success: false,
      error: 'No se pudo eliminar el puesto. Podés reintentar la operación.',
    }
  }

  logAuditoria({
    usuarioId: ctx.reclutadorId,
    accion: 'eliminar_puesto',
    entidad: 'puesto',
    entidadId: puestoId,
  })

  revalidarPuesto(puestoId)
  return { success: true, data: undefined }
}

/**
 * Cuántas postulaciones quedan archivadas si se reactiva el puesto: las del ciclo
 * que se está por dejar atrás. Alimenta el aviso del modal de reactivación.
 */
export async function contarPostulacionesDelUltimoCiclo(
  puestoId: string,
): Promise<ActionResult<number>> {
  const ctx = await getReclutadorContext()
  if (!ctx) return { success: false, error: 'No autorizado.' }

  const admin = createAdminClient()

  const { data: puesto, error: puestoError } = await admin
    .from('puesto')
    .select('id')
    .eq('id', puestoId)
    .eq('reclutador_id', ctx.reclutadorId)
    .maybeSingle()

  if (puestoError) {
    console.error('[puestos/actions] Error al verificar puesto en contarPostulacionesDelUltimoCiclo:', puestoError)
    return { success: false, error: 'No se pudo verificar el puesto.' }
  }
  if (!puesto) return { success: false, error: 'No autorizado.' }

  const cicloId = await getCicloMasReciente(puestoId)
  if (!cicloId) return { success: true, data: 0 }

  const { count, error } = await admin
    .from('postulacion')
    .select('id', { count: 'exact', head: true })
    .eq('historial_puesto_id', cicloId)

  if (error) {
    console.error('[puestos/actions] Error al contar postulaciones del ciclo:', error)
    return { success: false, error: 'No se pudo consultar el historial de postulaciones.' }
  }

  return { success: true, data: count ?? 0 }
}

/**
 * Reactiva un puesto cerrado abriendo un CICLO nuevo (registrarApertura).
 *
 * Las postulaciones del ciclo anterior no se tocan: quedan CERRADA y colgadas de
 * su ciclo, fuera del tablero. El puesto arranca limpio y quien había postulado
 * antes del cierre puede volver a aplicar, porque el UNIQUE es por ciclo.
 */
export async function reactivarPuesto(puestoId: string): Promise<ActionResult> {
  const ctx = await getReclutadorContext()
  if (!ctx) return { success: false, error: 'No autorizado.' }

  const admin = createAdminClient()

  // Un puesto de una empresa dada de baja no se puede reabrir: la baja de la
  // empresa es justamente lo que cerró sus puestos.
  const { data: puestoActual } = await admin
    .from('puesto')
    .select('empresa_id, fecha_baja_puesto, empresa(fecha_baja)')
    .eq('id', puestoId)
    .eq('reclutador_id', ctx.reclutadorId)
    .maybeSingle()

  if (!puestoActual) return { success: false, error: 'No autorizado.' }
  const { empresa_id: empresaId, fecha_baja_puesto: fechaBajaPuesto, empresa } = puestoActual as {
    empresa_id: string
    fecha_baja_puesto: string | null
    empresa: { fecha_baja: string | null } | null
  }
  if (empresa?.fecha_baja) {
    return { success: false, error: 'La empresa de este puesto está dada de baja.' }
  }

  // El .eq('activo', false) hace la reactivación idempotente: si el puesto ya está
  // activo (doble click), no matchea ninguna fila y no abrimos un segundo ciclo.
  // Dos ciclos abiertos partirían las postulaciones en dos tableros y contarían
  // como reapertura en la analítica.
  // El .is('fecha_baja_puesto', null) evita reactivar puestos eliminados lógicamente (H-204).
  const { data: actualizados, error } = await admin.from('puesto')
    .update({ activo: true })
    .eq('id', puestoId)
    .eq('reclutador_id', ctx.reclutadorId)
    .eq('activo', false)
    .is('fecha_baja_puesto', null)
    .select('titulo_puesto')

  if (error) return { success: false, error: 'No se pudo reactivar el puesto.' }

  if (!actualizados || actualizados.length === 0) {
    if (fechaBajaPuesto) {
      return { success: false, error: 'Un puesto eliminado no se puede reactivar.' }
    }
  } else {
    const { titulo_puesto } = actualizados[0] as { titulo_puesto: string }
    await registrarApertura(puestoId, empresaId, titulo_puesto)
  }

  logAuditoria({
    usuarioId: ctx.reclutadorId,
    accion: 'reactivar_puesto',
    entidad: 'puesto',
    entidadId: puestoId,
  })

  revalidarPuesto(puestoId)
  return { success: true, data: undefined }
}
