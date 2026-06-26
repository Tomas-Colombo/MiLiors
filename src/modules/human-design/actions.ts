'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import { humanDesignSchema } from './schema'
import { generarInforme } from '@/modules/informe/actions'
import type { ActionResult } from '@/lib/types/domain'

export async function guardarHumanDesign(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await verifySession()
  const supabase = await createClient()
  const admin = createAdminClient()

  const parsed = humanDesignSchema.safeParse({
    tipo_energetico: formData.get('tipo_energetico'),
    energy_type_classification: formData.get('energy_type_classification'),
    autoridad_hd: formData.get('autoridad_hd'),
    perfil_hd: formData.get('perfil_hd'),
    estrategia_hd: formData.get('estrategia_hd'),
  })

  if (!parsed.success) {
    return {
      success: false,
      error: 'Completá todos los campos.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const { data: postulante } = await supabase
    .from('perfil_postulante')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!postulante) return { success: false, error: 'Perfil no encontrado.' }
  const postulanteId = (postulante as { id: string }).id

  const { data: existing } = await supabase
    .from('human_design')
    .select('id, veces_guardado')
    .eq('postulante_id', postulanteId)
    .single()

  const existingTyped = existing as { id: string; veces_guardado: number } | null

  // El HD es un dato de por vida: permitir solo 1 actualización (corrección de error)
  if (existingTyped && existingTyped.veces_guardado >= 2) {
    return {
      success: false,
      error: 'Ya utilizaste la actualización permitida. Los datos de Human Design no pueden modificarse nuevamente.',
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {
    tipo_energetico: parsed.data.tipo_energetico,
    energy_type_classification: parsed.data.energy_type_classification,
    autoridad_hd: parsed.data.autoridad_hd,
    perfil_hd: parsed.data.perfil_hd,
    estrategia_hd: parsed.data.estrategia_hd,
  }

  let error: unknown
  if (existingTyped) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (admin.from('human_design') as any)
      .update({ ...payload, veces_guardado: existingTyped.veces_guardado + 1 })
      .eq('id', existingTyped.id)
    error = result.error
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (admin.from('human_design') as any)
      .insert({ postulante_id: postulanteId, ...payload, veces_guardado: 1 })
    error = result.error
  }

  if (error) return { success: false, error: 'No se pudo guardar el Human Design.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from('certificado_pdf') as any)
    .update({ desactualizado: true })
    .eq('postulante_id', postulanteId)

  revalidatePath('/postulante/human-design')
  revalidatePath('/postulante/perfil')
  revalidatePath('/postulante')

  // Auto-regenerar el informe de personalidad (errores son no-fatales)
  try {
    await generarInforme()
  } catch (e) {
    console.error('[human-design] Error auto-generando informe:', e)
  }

  return { success: true, data: undefined }
}

