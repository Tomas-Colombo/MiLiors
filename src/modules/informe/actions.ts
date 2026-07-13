'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import { generarInformePersonalidad } from './service'
import type { ActionResult } from '@/lib/types/domain'
import type { InformeContext } from './prompts'
import type { FormacionItem, ExperienciaItem, IdiomaItem, CompetenciaItem } from '@/modules/perfil-tecnico/queries'

async function recopilarContexto(postulanteId: string): Promise<InformeContext | null> {
  const session = await verifySession()
  const supabase = await createClient()

  // Basic profile
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

  // Dominantes via tabla intermedia
  const { data: test } = await supabase
    .from('test_eneagrama')
    .select('tiene_empate_dominante, test_eneagrama_dominante(puntaje_crudo, porcentaje, eneatipo(numero_eneatipo, nombre))')
    .eq('postulante_id', postulanteId)
    .single()

  if (!test) return null

  const testTyped = test as {
    tiene_empate_dominante: boolean
    test_eneagrama_dominante: {
      puntaje_crudo: number
      porcentaje: number
      eneatipo: { numero_eneatipo: number; nombre: string }
    }[]
  }

  if (testTyped.test_eneagrama_dominante.length === 0) return null

  const dominantes = testTyped.test_eneagrama_dominante.map(d => ({
    numero: d.eneatipo.numero_eneatipo,
    nombre: d.eneatipo.nombre,
    puntajeCrudo: d.puntaje_crudo,
    porcentaje: Number(d.porcentaje),
  }))

  // Human Design (optional)
  const { data: hd } = await supabase
    .from('human_design')
    .select('id, tipo_energetico, autoridad_hd, perfil_hd, estrategia_hd')
    .eq('postulante_id', postulanteId)
    .single()

  // Technical profile
  const { data: pt } = await supabase
    .from('perfil_tecnico')
    .select('id')
    .eq('postulante_id', postulanteId)
    .single()

  let formaciones: FormacionItem[] = []
  let experiencias: ExperienciaItem[] = []
  let idiomas: IdiomaItem[] = []
  let competencias: CompetenciaItem[] = []

  if (pt) {
    const ptId = (pt as { id: string }).id
    const [f, e, i, c] = await Promise.all([
      supabase.from('formacion_academica').select('id, institucion, titulo, fecha_graduacion').eq('perfil_tecnico_id', ptId),
      supabase.from('experiencia_laboral').select('id, empresa, puesto, fecha_inicio, fecha_fin, descripcion').eq('perfil_tecnico_id', ptId),
      supabase.from('idioma').select('id, nombre, nivel_idioma').eq('perfil_tecnico_id', ptId),
      supabase.from('postulante_competencia').select('competencia_id, competencia(id, nombre)').eq('perfil_tecnico_id', ptId),
    ])
    formaciones = (f.data ?? []) as FormacionItem[]
    experiencias = (e.data ?? []) as ExperienciaItem[]
    idiomas = (i.data ?? []) as IdiomaItem[]
    competencias = (c.data ?? []).map((row: unknown) => {
      const r = row as { competencia: { id: string; nombre: string } | null }
      return r.competencia ? { id: r.competencia.id, nombre: r.competencia.nombre } : null
    }).filter((x): x is CompetenciaItem => x !== null)
  }

  return {
    nombreCompleto: perfilTyped.nombre_completo,
    especificidadPuesto: perfilTyped.carrera?.nombre ?? perfilTyped.carrera_otra ?? null,
    dominantes,
    tieneEmpateDominante: testTyped.tiene_empate_dominante,
    humanDesign: hd ? (hd as { id: string; tipo_energetico: string; energy_type_classification: string | null; autoridad_hd: string; perfil_hd: string; estrategia_hd: string; veces_guardado: number }) : null,
    formaciones,
    experiencias,
    idiomas,
    competencias,
  }
}

/**
 * Generates (or regenerates) the applicant's personality report.
 * Can be called from:
 *   - Completing the Enneagram test (automatic)
 *   - "Retry" button in the UI (manual, on ERROR)
 *   - Saving Human Design (automatic)
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
    .select('id, estado_informe, contenido_informe')
    .eq('postulante_id', postulanteId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  let informeId: string
  // ¿Hay un informe válido previo que NO debemos destruir si la regeneración falla?
  // (p. ej. una caída transitoria del proveedor de IA no debe borrar un informe bueno)
  let teniaInformeValido = false

  if (informeExistente) {
    const prev = informeExistente as { id: string; estado_informe: string; contenido_informe: string | null }
    informeId = prev.id
    teniaInformeValido = prev.estado_informe === 'LISTO' && !!prev.contenido_informe
    // Marcamos PENDIENTE pero NO borramos el contenido: si la generación falla,
    // el informe anterior sigue intacto y se restaura a LISTO (ver fallarGeneracion).
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

  // Fallo de generación: si había un informe válido previo lo conservamos
  // (restauramos a LISTO sin tocar el contenido); si no, marcamos ERROR.
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
      contenido_informe: JSON.stringify(resultado.contenido_json),
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

