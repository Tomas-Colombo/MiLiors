'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import type { ActionResult } from '@/lib/types/domain'

export async function togglePerfilEnBusqueda(activo: boolean): Promise<ActionResult> {
  const session = await verifySession()
  const supabase = await createClient()

  const { error } = await supabase.from('perfil_postulante')
    .update({ perfil_en_busqueda: activo })
    .eq('usuario_id', session.id)

  if (error) return { success: false, error: 'No se pudo actualizar la visibilidad.' }

  revalidatePath('/postulante')
  revalidatePath('/postulante/perfil')
  return { success: true, data: undefined }
}
