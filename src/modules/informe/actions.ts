'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import { generarInformePersonalidad } from './service'
import type { ActionResult } from '@/lib/types/domain'
import type { InformeContext } from './prompts'
import type { FormacionItem, ExperienciaItem, IdiomaItem, CompetenciaItem } from '@/modules/perfil-tecnico/queries'

/**
 * Gathers all applicant data needed for the report.
 * Runs inside the Server Action to have server context access.
 */
async function recopilarContexto(postulanteId: string): Promise<InformeContext | null> {
  const session = await verifySession()
  const supabase = await createClient()

  // Basic profile
  const { data: perfil } = await supabase
    .from('perfil_postulante')
    .select('nombre_completo, especificidad_puesto')
    .eq('id', postulanteId)
    .eq('usuario_id', session.id)
    .single()

  if (!perfil) return null
  const perfilTyped = perfil as { nombre_completo: string; especificidad_puesto: string | null }

  // Eneatype from test
  const { data: test } = await supabase
    .from('test_eneagrama')
    .select('eneatipo_id, eneatipo(numero_eneatipo)')
    .eq('postulante_id', postulanteId)
    .single()

  if (!test) return null
  const testTyped = test as { eneatipo_id: string | null; eneatipo: { numero_eneatipo: number } | null }
  if (!testTyped.eneatipo_id || !testTyped.eneatipo) return null
  const eneatipoNumero = testTyped.eneatipo.numero_eneatipo

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
    especificidadPuesto: perfilTyped.especificidad_puesto,
    eneatipoNumero,
    humanDesign: hd ? (hd as { id: string; tipo_energetico: string; autoridad_hd: string; perfil_hd: string; estrategia_hd: string }) : null,
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

  // Get postulante_id
  const { data: postulante } = await supabase
    .from('perfil_postulante')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!postulante) return { success: false, error: 'Perfil no encontrado.' }
  const postulanteId = (postulante as { id: string }).id

  // Get or create the report record
  const { data: informeExistente } = await supabase
    .from('informe_personalidad')
    .select('id')
    .eq('postulante_id', postulanteId)
    .single()

  let informeId: string

  if (informeExistente) {
    informeId = (informeExistente as { id: string }).id
    // Mark as PENDIENTE before generating
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('informe_personalidad') as any)
      .update({ estado_informe: 'PENDIENTE', contenido_informe: null })
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

  // Gather context
  const ctx = await recopilarContexto(postulanteId)
  if (!ctx) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('informe_personalidad') as any)
      .update({ estado_informe: 'ERROR' })
      .eq('id', informeId)
    return { success: false, error: 'Datos insuficientes para generar el informe. Completá el Eneagrama.' }
  }

  // Generate with AI
  const resultado = await generarInformePersonalidad(ctx)

  if (!resultado.ok) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('informe_personalidad') as any)
      .update({ estado_informe: 'ERROR' })
      .eq('id', informeId)
    revalidatePath('/postulante/informe')
    return { success: false, error: `No se pudo generar el informe: ${resultado.motivo}` }
  }

  // Save content and mark as LISTO
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from('informe_personalidad') as any)
    .update({
      estado_informe: 'LISTO',
      contenido_informe: resultado.contenido,
      fecha_generacion: new Date().toISOString(),
    })
    .eq('id', informeId)

  revalidatePath('/postulante/informe')
  revalidatePath('/postulante')
  return { success: true, data: undefined }
}
