'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import { puestoSchema } from './schema'
import type { ActionResult } from '@/lib/types/domain'
import { parseFormularioPreselectorField } from '@/modules/preselector/schema'
import { persistirFormularioPreselector, eliminarFormularioPreselector } from '@/modules/preselector/service'
import { marcarActividadPuesto } from './actividad'

/**
 * Contratación opcional al cerrar/eliminar un puesto.
 * - `plataforma`: la persona contratada es un postulante del sistema (relación real).
 * - `externo`: se contrató por fuera; solo guardamos el nombre libre.
 */
export type ContratacionInput =
  | { tipo: 'plataforma'; postulanteId: string }
  | { tipo: 'externo'; nombre: string }

// Helper: get reclutador_id and empresa_id for the current user
async function getReclutadorContext(): Promise<{ reclutadorId: string; empresaId: string } | null> {
  const session = await verifySession()
  const supabase = await createClient()

  const { data } = await supabase
    .from('perfil_reclutador')
    .select('id, empresa_id')
    .eq('usuario_id', session.id)
    .single()

  if (!data) return null
  const d = data as { id: string; empresa_id: string | null }
  if (!d.empresa_id) return null
  return { reclutadorId: d.id, empresaId: d.empresa_id }
}

// Register opening in historial_puesto and check analytics alert
async function registrarApertura(puestoId: string, empresaId: string, tituloPuesto: string) {
  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from('historial_puesto') as any).insert({
    puesto_id: puestoId,
    fecha_inicio: new Date().toISOString(),
  })

  // Analytics alert: ≥3 openings of the same title in the last year
  const unAñoAtras = new Date()
  unAñoAtras.setFullYear(unAñoAtras.getFullYear() - 1)

  const { data: historiales } = await admin
    .from('historial_puesto')
    .select('id, puesto(titulo_puesto, empresa_id)')
    .gte('fecha_inicio', unAñoAtras.toISOString())

  if (historiales) {
    const aperturasEmpresa = (historiales as unknown[]).filter((h) => {
      const row = h as { puesto: { titulo_puesto: string; empresa_id: string } | null }
      return (
        row.puesto?.empresa_id === empresaId &&
        row.puesto?.titulo_puesto?.toLowerCase() === tituloPuesto.toLowerCase()
      )
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
 * Registra la contratación en el CICLO abierto del puesto (historial_puesto con
 * fecha_fin IS NULL). Debe llamarse ANTES de cerrar el ciclo. Si por algún puesto
 * viejo no existiera un ciclo abierto, se crea uno para poder colgar la contratación.
 */
async function registrarContratacion(
  admin: ReturnType<typeof createAdminClient>,
  puestoId: string,
  contratacion: ContratacionInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Validaciones de entrada. El nombre externo es opcional; el postulante NO.
  if (contratacion.tipo === 'plataforma') {
    if (!contratacion.postulanteId) {
      return { ok: false, error: 'Elegí el postulante contratado.' }
    }
    // El postulante tiene que haber aplicado a este puesto
    const { data: aplico } = await admin
      .from('postulacion')
      .select('id')
      .eq('puesto_id', puestoId)
      .eq('postulante_id', contratacion.postulanteId)
      .maybeSingle()
    if (!aplico) {
      return { ok: false, error: 'El postulante seleccionado no aplicó a este puesto.' }
    }
  }

  // Ciclo abierto más reciente
  const { data: hist } = await admin
    .from('historial_puesto')
    .select('id')
    .eq('puesto_id', puestoId)
    .is('fecha_fin', null)
    .order('fecha_inicio', { ascending: false })
    .limit(1)
    .maybeSingle()

  let historialId = (hist as { id: string } | null)?.id ?? null

  // Edge: puesto sin ciclo abierto → crear uno para no perder la contratación
  if (!historialId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: nuevo, error } = await (admin.from('historial_puesto') as any)
      .insert({ puesto_id: puestoId })
      .select('id')
      .single()
    if (error || !nuevo) return { ok: false, error: 'No se pudo registrar el ciclo del puesto.' }
    historialId = (nuevo as { id: string }).id
  }

  const row =
    contratacion.tipo === 'plataforma'
      ? { historial_puesto_id: historialId, postulante_id: contratacion.postulanteId, nombre_externo: null }
      : { historial_puesto_id: historialId, postulante_id: null, nombre_externo: contratacion.nombre.trim() || null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('contratacion') as any).insert(row)
  if (error) return { ok: false, error: 'No se pudo registrar la contratación.' }
  return { ok: true }
}

/**
 * Postulantes que aplicaron al puesto, para el selector "contraté a alguien de
 * la plataforma". Solo accesible por el reclutador dueño del puesto.
 */
export async function getPostulantesDePuesto(
  puestoId: string,
): Promise<{ postulanteId: string; nombre: string }[]> {
  const ctx = await getReclutadorContext()
  if (!ctx) return []

  const admin = createAdminClient()

  // Verificar propiedad del puesto
  const { data: puesto } = await admin
    .from('puesto')
    .select('id')
    .eq('id', puestoId)
    .eq('reclutador_id', ctx.reclutadorId)
    .maybeSingle()
  if (!puesto) return []

  const { data } = await admin
    .from('postulacion')
    .select('postulante_id, perfil_postulante(nombre_completo)')
    .eq('puesto_id', puestoId)
    .order('fecha_postulacion', { ascending: false })

  const seen = new Set<string>()
  const out: { postulanteId: string; nombre: string }[] = []
  for (const row of (data ?? []) as unknown[]) {
    const r = row as { postulante_id: string; perfil_postulante: { nombre_completo: string } | null }
    if (seen.has(r.postulante_id)) continue
    seen.add(r.postulante_id)
    out.push({ postulanteId: r.postulante_id, nombre: r.perfil_postulante?.nombre_completo ?? 'Sin nombre' })
  }
  return out
}

export async function publicarPuesto(
  _prevState: ActionResult<{ puestoId: string }>,
  formData: FormData
): Promise<ActionResult<{ puestoId: string }>> {
  const ctx = await getReclutadorContext()
  if (!ctx) return { success: false, error: 'Completá el onboarding de empresa antes de publicar puestos.' }

  const parsed = puestoSchema.safeParse({
    titulo_puesto: formData.get('titulo_puesto'),
    descripcion_texto: formData.get('descripcion_texto') || undefined,
    sector_id: formData.get('sector_id') || undefined,
    carrera_id: formData.get('carrera_id') || undefined,
    idioma: formData.get('idioma'),
    carga_horaria: formData.get('carga_horaria'),
    ubicacion: formData.get('ubicacion'),
    provincia_id: formData.get('provincia_id') || undefined,
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

  const formulario = parseFormularioPreselectorField(formData.get('formulario_preselector'))
  if (formulario.kind === 'invalid') {
    return {
      success: false,
      error: formulario.error,
      fieldErrors: formulario.fieldErrors ?? { formulario_preselector: [formulario.error] },
    }
  }

  // Modalidad remota → sin ubicación geográfica.
  const esRemoto = parsed.data.ubicacion === 'REMOTO'

  const admin = createAdminClient()
  const puestoId = crypto.randomUUID()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('puesto') as any).insert({
    id: puestoId,
    reclutador_id: ctx.reclutadorId,
    empresa_id: ctx.empresaId,
    ...parsed.data,
    sector_id: parsed.data.sector_id || null,
    carrera_id: parsed.data.carrera_id || null,
    provincia_id: esRemoto ? null : parsed.data.provincia_id || null,
    localidad_id: esRemoto ? null : parsed.data.localidad_id || null,
    activo: true,
  })

  if (error) return { success: false, error: 'No se pudo publicar el puesto.' }

  if (formulario.kind === 'valid') {
    const resultado = await persistirFormularioPreselector(admin, puestoId, formulario.data)
    if (!resultado.ok) return { success: false, error: resultado.error }
  }

  await registrarApertura(puestoId, ctx.empresaId, parsed.data.titulo_puesto)

  revalidatePath('/reclutador/puestos')
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
    titulo_puesto: formData.get('titulo_puesto'),
    descripcion_texto: formData.get('descripcion_texto') || undefined,
    sector_id: formData.get('sector_id') || undefined,
    carrera_id: formData.get('carrera_id') || undefined,
    idioma: formData.get('idioma'),
    carga_horaria: formData.get('carga_horaria'),
    ubicacion: formData.get('ubicacion'),
    provincia_id: formData.get('provincia_id') || undefined,
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

  const formulario = parseFormularioPreselectorField(formData.get('formulario_preselector'))
  if (formulario.kind === 'invalid') {
    return {
      success: false,
      error: formulario.error,
      fieldErrors: formulario.fieldErrors ?? { formulario_preselector: [formulario.error] },
    }
  }

  const esRemoto = parsed.data.ubicacion === 'REMOTO'

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: actualizados, error } = await (supabase.from('puesto') as any)
    .update({
      ...parsed.data,
      sector_id: parsed.data.sector_id || null,
      carrera_id: parsed.data.carrera_id || null,
      provincia_id: esRemoto ? null : parsed.data.provincia_id || null,
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

  revalidatePath(`/reclutador/puestos/${puestoId}`)
  revalidatePath('/reclutador/puestos')
  return { success: true, data: undefined }
}

export async function cerrarPuesto(
  puestoId: string,
  contratacion?: ContratacionInput | null,
): Promise<ActionResult> {
  const ctx = await getReclutadorContext()
  if (!ctx) return { success: false, error: 'No autorizado.' }

  const admin = createAdminClient()

  // Registrar contratación (si la hubo) sobre el ciclo abierto, antes de cerrarlo.
  if (contratacion) {
    const res = await registrarContratacion(admin, puestoId, contratacion)
    if (!res.ok) return { success: false, error: res.error }
  }

  // Cierre reversible: el puesto se desactiva pero sigue visible para el
  // reclutador y puede reactivarse. No se da de baja (fecha_baja_puesto).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: puestoError } = await (admin.from('puesto') as any)
    .update({ activo: false })
    .eq('id', puestoId)
    .eq('reclutador_id', ctx.reclutadorId)

  if (puestoError) return { success: false, error: 'No se pudo cerrar el puesto.' }

  // Close active historial_puesto entry
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from('historial_puesto') as any)
    .update({ fecha_fin: new Date().toISOString() })
    .eq('puesto_id', puestoId)
    .is('fecha_fin', null)

  // Cascade: ENVIADA/VISTO applications → CERRADA
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from('postulacion') as any)
    .update({ estado: 'CERRADA' })
    .eq('puesto_id', puestoId)
    .in('estado', ['ENVIADA', 'VISTO'])

  revalidatePath('/reclutador/puestos')
  revalidatePath(`/reclutador/puestos/${puestoId}`)
  return { success: true, data: undefined }
}

export async function eliminarPuesto(
  puestoId: string,
  contratacion?: ContratacionInput | null,
): Promise<ActionResult> {
  const ctx = await getReclutadorContext()
  if (!ctx) return { success: false, error: 'No autorizado.' }

  const admin = createAdminClient()

  // Registrar contratación (si la hubo) sobre el ciclo abierto, antes de cerrarlo.
  if (contratacion) {
    const res = await registrarContratacion(admin, puestoId, contratacion)
    if (!res.ok) return { success: false, error: res.error }
  }

  // Baja lógica: se registra fecha_baja_puesto. El puesto y sus postulaciones
  // desaparecen de las vistas del reclutador, pero se conservan en la base
  // para las métricas del admin. No es reversible desde el perfil.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: puestoError } = await (admin.from('puesto') as any)
    .update({ activo: false, fecha_baja_puesto: new Date().toISOString() })
    .eq('id', puestoId)
    .eq('reclutador_id', ctx.reclutadorId)

  if (puestoError) return { success: false, error: 'No se pudo eliminar el puesto.' }

  // Close active historial_puesto entry
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from('historial_puesto') as any)
    .update({ fecha_fin: new Date().toISOString() })
    .eq('puesto_id', puestoId)
    .is('fecha_fin', null)

  // Cascade: ENVIADA/VISTO applications → CERRADA
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from('postulacion') as any)
    .update({ estado: 'CERRADA' })
    .eq('puesto_id', puestoId)
    .in('estado', ['ENVIADA', 'VISTO'])

  revalidatePath('/reclutador/puestos')
  revalidatePath('/reclutador/postulaciones')
  revalidatePath(`/reclutador/puestos/${puestoId}`)
  return { success: true, data: undefined }
}

export async function reactivarPuesto(puestoId: string): Promise<ActionResult> {
  const ctx = await getReclutadorContext()
  if (!ctx) return { success: false, error: 'No autorizado.' }

  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('puesto') as any)
    .update({ activo: true, fecha_baja_puesto: null })
    .eq('id', puestoId)
    .eq('reclutador_id', ctx.reclutadorId)

  if (error) return { success: false, error: 'No se pudo reactivar el puesto.' }

  const supabase = await createClient()
  const { data: puesto } = await supabase
    .from('puesto')
    .select('titulo_puesto')
    .eq('id', puestoId)
    .single()

  if (puesto) {
    await registrarApertura(puestoId, ctx.empresaId, (puesto as { titulo_puesto: string }).titulo_puesto)
  }

  revalidatePath('/reclutador/puestos')
  return { success: true, data: undefined }
}
