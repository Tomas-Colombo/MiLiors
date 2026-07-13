'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import { generarInformePersonalidad, type InformeContext } from './service'
import type { ActionResult } from '@/lib/types/domain'

async function recopilarContexto(postulanteId: string): Promise<InformeContext | null> {
  const session = await verifySession()
  const supabase = await createClient()

  // Perfil básico
  const { data: perfil } = await supabase
    .from('perfil_postulante')
    .select('nombre_completo, carrera_otra, carrera:carrera_id(nombre)')
    .eq('id', postulanteId)
    .eq('usuario_id', session.id)
    .single()

  if (!perfil) return null
  const perfilTyped = perfil as {
    nombre_completo: string
    carrera_otra: string | null
    carrera: { nombre: string } | null
  }

  // Test de Eneagrama vigente
  const { data: test } = await supabase
    .from('test_eneagrama')
    .select('id')
    .eq('postulante_id', postulanteId)
    .single()

  if (!test) return null
  const testId = (test as { id: string }).id

  // Los 9 scores (porcentaje por eneatipo)
  const { data: puntajes } = await supabase
    .from('resultado_puntaje_eneagrama')
    .select('eneatipo_numero, porcentaje')
    .eq('test_eneagrama_id', testId)

  const filas = (puntajes ?? []) as { eneatipo_numero: number; porcentaje: number }[]
  if (filas.length === 0) return null

  const scores: Record<number, number> = {}
  for (const f of filas) scores[f.eneatipo_numero] = Number(f.porcentaje)

  // Human Design (opcional)
  const { data: hd } = await supabase
    .from('human_design')
    .select('tipo_energetico, autoridad_hd, perfil_hd, estrategia_hd')
    .eq('postulante_id', postulanteId)
    .single()

  return {
    nombre: perfilTyped.nombre_completo,
    especificidadPuesto: perfilTyped.carrera?.nombre ?? perfilTyped.carrera_otra ?? null,
    scores,
    humanDesign: hd
      ? (hd as { tipo_energetico: string; autoridad_hd: string; perfil_hd: string; estrategia_hd: string })
      : null,
  }
}

/**
 * Genera (o regenera) el informe de personalidad del postulante.
 *
 * Se usa desde:
 *   - Completar el Eneagrama inicial (automático, vía módulo eneagrama).
 *   - Botón "Actualizar" en la sección (manual) — solo si está desactualizado.
 *   - Botón "Reintentar" (manual) cuando quedó en ERROR.
 *
 * REGLA: si ya existe un informe LISTO y NO está desactualizado, no se regenera
 * (evita gastar créditos de IA sin necesidad).
 */
export async function generarInforme(): Promise<ActionResult> {
  const session = await verifySession()
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: postulante } = await supabase
    .from('perfil_postulante')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!postulante) return { success: false, error: 'Perfil no encontrado.' }
  const postulanteId = (postulante as { id: string }).id

  const { data: informeExistente } = await supabase
    .from('informe_personalidad')
    .select('id, estado_informe, contenido_json, desactualizado')
    .eq('postulante_id', postulanteId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  const prev = informeExistente as {
    id: string
    estado_informe: string
    contenido_json: unknown
    desactualizado: boolean
  } | null

  const teniaInformeValido = !!prev && prev.estado_informe === 'LISTO' && prev.contenido_json != null

  // Bloqueo: no permitir actualizar un informe que ya está al día.
  if (teniaInformeValido && !prev!.desactualizado) {
    return { success: false, error: 'El informe ya está actualizado.' }
  }

  let informeId: string
  if (prev) {
    informeId = prev.id
    // Marcamos PENDIENTE sin borrar el contenido: si la generación falla,
    // el informe anterior sigue intacto (ver fallarGeneracion).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('informe_personalidad') as any)
      .update({ estado_informe: 'PENDIENTE' })
      .eq('id', informeId)
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: nuevo } = await (admin.from('informe_personalidad') as any)
      .insert({ postulante_id: postulanteId, estado_informe: 'PENDIENTE' })
      .select('id')
      .single()
    if (!nuevo) return { success: false, error: 'No se pudo crear el registro del informe.' }
    informeId = (nuevo as { id: string }).id
  }

  async function fallarGeneracion(mensaje: string): Promise<ActionResult> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('informe_personalidad') as any)
      .update({ estado_informe: teniaInformeValido ? 'LISTO' : 'ERROR' })
      .eq('id', informeId)
    revalidatePath('/postulante/informe')
    revalidatePath('/postulante')
    return {
      success: false,
      error: teniaInformeValido
        ? `No se pudo regenerar el informe: ${mensaje} Se conservó tu informe anterior.`
        : mensaje,
    }
  }

  const ctx = await recopilarContexto(postulanteId)
  if (!ctx) {
    return fallarGeneracion('Datos insuficientes para generar el informe. Completá el Eneagrama.')
  }

  const resultado = await generarInformePersonalidad(ctx)
  if (!resultado.ok) {
    return fallarGeneracion(`No se pudo generar el informe: ${resultado.motivo}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: saveError } = await (admin.from('informe_personalidad') as any)
    .update({
      estado_informe: 'LISTO',
      contenido_json: resultado.contenido_json,
      contenido_informe: null,
      fecha_generacion: new Date().toISOString(),
      desactualizado: false,
    })
    .eq('id', informeId)

  if (saveError) {
    console.error('[informe/actions] Error al guardar informe LISTO:', saveError)
    return fallarGeneracion('El informe se generó pero no se pudo guardar. Intentá de nuevo.')
  }

  revalidatePath('/postulante/informe')
  revalidatePath('/postulante')
  return { success: true, data: undefined }
}
