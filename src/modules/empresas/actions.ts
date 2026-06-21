'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import type { ActionResult } from '@/lib/types/domain'

const empresaSchema = z.object({
  nombre_empresa: z.string().min(2, { message: 'Ingresá el nombre de la empresa.' }).max(200).trim(),
  descripcion: z.string().max(1000).optional(),
  url_empresa: z.string().url({ message: 'Ingresá una URL válida.' }).optional().or(z.literal('')),
})

export async function crearEmpresaYAsociar(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await verifySession()

  const parsed = empresaSchema.safeParse({
    nombre_empresa: formData.get('nombre_empresa'),
    descripcion: formData.get('descripcion') || undefined,
    url_empresa: formData.get('url_empresa') || undefined,
  })

  if (!parsed.success) {
    return {
      success: false,
      error: 'Revisá los campos del formulario.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const admin = createAdminClient()
  const empresaId = crypto.randomUUID()

  // Create company
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: empresaError } = await (admin.from('empresa') as any).insert({
    id: empresaId,
    nombre_empresa: parsed.data.nombre_empresa,
    descripcion: parsed.data.descripcion ?? null,
    url_empresa: parsed.data.url_empresa || null,
  })

  if (empresaError) return { success: false, error: 'No se pudo crear la empresa.' }

  // Associate to recruiter profile (upsert)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: reclutadorError } = await (admin.from('perfil_reclutador') as any)
    .upsert(
      { usuario_id: session.id, empresa_id: empresaId },
      { onConflict: 'usuario_id' }
    )

  if (reclutadorError) return { success: false, error: 'No se pudo asociar la empresa al perfil.' }

  revalidatePath('/reclutador')
  redirect('/reclutador/puestos')
}
