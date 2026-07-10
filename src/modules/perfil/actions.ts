'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { onboardingPostulanteSchema } from '@/modules/eneagrama/schema'
import type { ActionResult } from '@/lib/types/domain'

function normalizeUrl(val: FormDataEntryValue | null): string | undefined {
  if (!val || typeof val !== 'string' || val.trim() === '') return undefined
  const trimmed = val.trim()
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`
  return trimmed
}

// ─── Postulante ───────────────────────────────────────────────────────────────

export async function actualizarPerfilPostulante(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await verifySession()

  const raw = {
    nombre_completo: formData.get('nombre_completo'),
    provincia_id: formData.get('provincia_id') || '',
    localidad_id: formData.get('localidad_id') || '',
    telefono: formData.get('telefono') || undefined,
    especificidad_puesto: formData.get('especificidad_puesto') || undefined,
    enlace_linkedin: normalizeUrl(formData.get('enlace_linkedin')),
    portfolio: normalizeUrl(formData.get('portfolio')),
  }

  const parsed = onboardingPostulanteSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Revisá los campos del formulario.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const supabase = await createClient()

  const { data: existente } = await supabase
    .from('perfil_postulante')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!existente) {
    return { success: false, error: 'No se encontró el perfil del postulante.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('perfil_postulante') as any)
    .update({
      nombre_completo: parsed.data.nombre_completo,
      provincia_id: parsed.data.provincia_id,
      localidad_id: parsed.data.localidad_id,
      telefono: parsed.data.telefono || null,
      especificidad_puesto: parsed.data.especificidad_puesto || null,
      enlace_linkedin: parsed.data.enlace_linkedin || null,
      portfolio: parsed.data.portfolio || null,
    })
    .eq('id', (existente as { id: string }).id)

  if (error) {
    return { success: false, error: 'No se pudieron guardar los cambios. Intentá de nuevo.' }
  }

  revalidatePath('/postulante/mi-perfil')
  return { success: true, data: undefined }
}

// ─── Reclutador ──────────────────────────────────────────────────────────────

const perfilReclutadorSchema = z.object({
  nombre_reclutador: z
    .string()
    .min(2, { message: 'Ingresá tu nombre completo.' })
    .max(200)
    .trim(),
  nombre_empresa: z
    .string()
    .min(2, { message: 'Ingresá el nombre de la empresa.' })
    .max(200)
    .trim(),
  descripcion: z.string().max(1000).optional(),
  link_url: z
    .string()
    .url({ message: 'Ingresá una URL válida.' })
    .optional()
    .or(z.literal('')),
})

export async function actualizarPerfilReclutador(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await verifySession()

  const raw = {
    nombre_reclutador: formData.get('nombre_reclutador'),
    nombre_empresa: formData.get('nombre_empresa'),
    descripcion: formData.get('descripcion') || undefined,
    link_url: formData.get('link_url') || undefined,
  }

  const parsed = perfilReclutadorSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Revisá los campos del formulario.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const supabase = await createClient()

  // Look up perfil_reclutador to get empresa_id
  const { data: perfilRec } = await supabase
    .from('perfil_reclutador')
    .select('id, empresa_id')
    .eq('usuario_id', session.id)
    .single()

  if (!perfilRec) {
    return { success: false, error: 'No se encontró el perfil del reclutador.' }
  }

  const { id: perfilId, empresa_id: empresaId } = perfilRec as { id: string; empresa_id: string }

  // Update perfil_reclutador
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: perfilError } = await (supabase.from('perfil_reclutador') as any)
    .update({ nombre_reclutador: parsed.data.nombre_reclutador })
    .eq('id', perfilId)

  if (perfilError) {
    return { success: false, error: 'No se pudo actualizar el perfil. Intentá de nuevo.' }
  }

  // Update empresa
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: empresaError } = await (supabase.from('empresa') as any)
    .update({
      nombre_empresa: parsed.data.nombre_empresa,
      descripcion: parsed.data.descripcion ?? null,
      link_url: parsed.data.link_url || null,
    })
    .eq('id', empresaId)

  if (empresaError) {
    return { success: false, error: 'No se pudo actualizar la empresa. Intentá de nuevo.' }
  }

  revalidatePath('/reclutador/mi-perfil')
  return { success: true, data: undefined }
}

// ─── Cambiar contraseña ───────────────────────────────────────────────────────

const cambiarPasswordSchema = z
  .object({
    nueva_password: z
      .string()
      .min(8, { message: 'La contraseña debe tener al menos 8 caracteres.' }),
    confirmar_password: z.string(),
  })
  .refine((d) => d.nueva_password === d.confirmar_password, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmar_password'],
  })

export async function cambiarPassword(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await verifySession()

  const raw = {
    nueva_password: formData.get('nueva_password'),
    confirmar_password: formData.get('confirmar_password'),
  }

  const parsed = cambiarPasswordSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Revisá los campos.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.nueva_password,
  })

  if (error) {
    return { success: false, error: 'No se pudo cambiar la contraseña. Intentá de nuevo.' }
  }

  return { success: true, data: undefined }
}
