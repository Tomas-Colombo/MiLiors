'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import { humanDesignSchema } from './schema'
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
    .select('id')
    .eq('postulante_id', postulanteId)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {
    tipo_energetico: parsed.data.tipo_energetico,
    autoridad_hd: parsed.data.autoridad_hd,
    perfil_hd: parsed.data.perfil_hd,
    estrategia_hd: parsed.data.estrategia_hd,
  }

  let error: unknown
  if (existing) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (admin.from('human_design') as any)
      .update(payload)
      .eq('id', (existing as { id: string }).id)
    error = result.error
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (admin.from('human_design') as any)
      .insert({ postulante_id: postulanteId, ...payload })
    error = result.error
  }

  if (error) return { success: false, error: 'No se pudo guardar el Human Design.' }

  // Set report to PENDING (LLM regeneration is Phase 4)
  const { data: informe } = await supabase
    .from('informe_personalidad')
    .select('id')
    .eq('postulante_id', postulanteId)
    .single()

  if (informe) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('informe_personalidad') as any)
      .update({ estado_informe: 'PENDIENTE', contenido_informe: null })
      .eq('id', (informe as { id: string }).id)
  }

  revalidatePath('/postulante/human-design')
  revalidatePath('/postulante/perfil')
  return { success: true, data: undefined }
}

export async function eliminarHumanDesign(): Promise<ActionResult> {
  const session = await verifySession()
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: postulante } = await supabase
    .from('perfil_postulante')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!postulante) return { success: false, error: 'Perfil no encontrado.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('human_design') as any)
    .delete()
    .eq('postulante_id', (postulante as { id: string }).id)

  if (error) return { success: false, error: 'No se pudo eliminar.' }

  revalidatePath('/postulante/human-design')
  return { success: true, data: undefined }
}
