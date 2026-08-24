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
    localidad_id: formData.get('localidad_id') || '',
    telefono: formData.get('telefono') || undefined,
    carrera_id: formData.get('carrera_id') || undefined,
    carrera_otra: formData.get('carrera_otra') || undefined,
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

  const { error } = await supabase.from('perfil_postulante')
    .update({
      nombre_completo: parsed.data.nombre_completo,
      localidad_id: parsed.data.localidad_id,
      telefono: parsed.data.telefono || null,
      carrera_id: parsed.data.carrera_id || null,
      carrera_otra: parsed.data.carrera_otra || null,
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

// Los datos de las empresas se administran en /reclutador/empresas: un
// reclutador puede tener varias, así que acá solo van sus propios datos.
const perfilReclutadorSchema = z.object({
  nombre_reclutador: z
    .string()
    .min(2, { message: 'Ingresá tu nombre completo.' })
    .max(200)
    .trim(),
})

export async function actualizarPerfilReclutador(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await verifySession()

  const raw = {
    nombre_reclutador: formData.get('nombre_reclutador'),
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

  const { error: perfilError } = await supabase.from('perfil_reclutador')
    .update({ nombre_reclutador: parsed.data.nombre_reclutador })
    .eq('usuario_id', session.id)

  if (perfilError) {
    return { success: false, error: 'No se pudo actualizar el perfil. Intentá de nuevo.' }
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

/**
 * Enciende o apaga la visibilidad del informe de personalidad en la página
 * pública de verificación del certificado (/verificar/[id]).
 */
export async function actualizarVisibilidadPersonalidad(visible: boolean): Promise<ActionResult> {
  const session = await verifySession()
  const supabase = await createClient()

  const { error } = await supabase.from('perfil_postulante')
    .update({ mostrar_personalidad_publico: visible })
    .eq('usuario_id', session.id)

  if (error) return { success: false, error: 'No se pudo guardar la preferencia.' }

  revalidatePath('/postulante/mi-perfil')
  return { success: true, data: undefined }
}
