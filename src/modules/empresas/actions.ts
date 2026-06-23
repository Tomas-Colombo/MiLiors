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
    link_url: parsed.data.url_empresa || null,
  })

  if (empresaError) {
    console.error('[crearEmpresaYAsociar] empresa insert error:', empresaError)
    return { success: false, error: 'No se pudo crear la empresa.' }
  }

  // Associate to recruiter profile — insert on first time, update empresa_id if profile already exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin.from('perfil_reclutador') as any)
    .select('id')
    .eq('usuario_id', session.id)
    .maybeSingle()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reclutadorQuery = existing
    ? (admin.from('perfil_reclutador') as any)
        .update({ empresa_id: empresaId })
        .eq('usuario_id', session.id)
    : (admin.from('perfil_reclutador') as any)
        .insert({ usuario_id: session.id, empresa_id: empresaId, nombre_reclutador: session.email })

  const { error: reclutadorError } = await reclutadorQuery

  if (reclutadorError) {
    console.error('[crearEmpresaYAsociar] perfil_reclutador error:', reclutadorError)
    return { success: false, error: 'No se pudo asociar la empresa al perfil.' }
  }

  revalidatePath('/reclutador')
  redirect('/reclutador/puestos')
}
