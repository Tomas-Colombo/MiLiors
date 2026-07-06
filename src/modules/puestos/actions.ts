'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import { puestoSchema } from './schema'
import type { ActionResult } from '@/lib/types/domain'

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
    idioma: formData.get('idioma'),
    carga_horaria: formData.get('carga_horaria'),
    ubicacion: formData.get('ubicacion'),
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

  const admin = createAdminClient()
  const puestoId = crypto.randomUUID()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('puesto') as any).insert({
    id: puestoId,
    reclutador_id: ctx.reclutadorId,
    empresa_id: ctx.empresaId,
    ...parsed.data,
    sector_id: parsed.data.sector_id || null,
    activo: true,
  })

  if (error) return { success: false, error: 'No se pudo publicar el puesto.' }

  await registrarApertura(puestoId, ctx.empresaId, parsed.data.titulo_puesto)

  revalidatePath('/reclutador/puestos')
  redirect(`/reclutador/puestos/${puestoId}`)
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
    idioma: formData.get('idioma'),
    carga_horaria: formData.get('carga_horaria'),
    ubicacion: formData.get('ubicacion'),
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

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('puesto') as any)
    .update({ ...parsed.data, sector_id: parsed.data.sector_id || null })
    .eq('id', puestoId)
    .eq('reclutador_id', ctx.reclutadorId)

  if (error) return { success: false, error: 'No se pudo actualizar el puesto.' }
  revalidatePath(`/reclutador/puestos/${puestoId}`)
  revalidatePath('/reclutador/puestos')
  return { success: true, data: undefined }
}

export async function cerrarPuesto(puestoId: string): Promise<ActionResult> {
  const ctx = await getReclutadorContext()
  if (!ctx) return { success: false, error: 'No autorizado.' }

  const admin = createAdminClient()

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

export async function eliminarPuesto(puestoId: string): Promise<ActionResult> {
  const ctx = await getReclutadorContext()
  if (!ctx) return { success: false, error: 'No autorizado.' }

  const admin = createAdminClient()

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
