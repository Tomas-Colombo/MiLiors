'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { onboardingPostulanteSchema } from '@/modules/eneagrama/schema'
import { passwordSchema } from '@/modules/auth/schema'
import { mensajeErrorPassword } from '@/modules/auth/password-error'
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
    nombre_preferido: formData.get('nombre_preferido') || undefined,
    provincia_id: formData.get('provincia_id') || '',
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
    .select('id, nombre_preferido')
    .eq('usuario_id', session.id)
    .single()

  if (!existente) {
    return { success: false, error: 'No se encontró el perfil del postulante.' }
  }

  const nombrePreferido = parsed.data.nombre_preferido || null

  const { error } = await supabase.from('perfil_postulante')
    .update({
      nombre_completo: parsed.data.nombre_completo,
      nombre_preferido: nombrePreferido,
      // La localidad es opcional; si vino, el trigger de la base recalcula
      // provincia_id a partir de ella y descarta lo que mande el formulario.
      provincia_id: parsed.data.provincia_id,
      localidad_id: parsed.data.localidad_id || null,
      telefono: parsed.data.telefono || null,
      carrera_id: parsed.data.carrera_id || null,
      carrera_otra: parsed.data.carrera_otra || null,
      enlace_linkedin: parsed.data.enlace_linkedin || null,
      portfolio: parsed.data.portfolio || null,
    })
    .eq('id', existente.id)

  if (error) {
    return { success: false, error: 'No se pudieron guardar los cambios. Intentá de nuevo.' }
  }

  // El informe está redactado con el nombre preferido: si cambió, queda
  // desactualizado (sin regenerar, igual que al rehacer el Eneagrama).
  if (nombrePreferido !== existente.nombre_preferido) {
    await supabase
      .from('informe_personalidad')
      .update({ desactualizado: true })
      .eq('postulante_id', existente.id)
      .eq('estado_informe', 'LISTO')
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

// Las reglas son las mismas del alta y del restablecimiento por mail
// (`passwordSchema` en @/modules/auth/schema). Acá antes se pedía sólo el
// mínimo de 8 caracteres: quien entraba por "mi perfil" podía bajarse la
// contraseña por debajo de lo que la app exige en la puerta, y la barrera real
// pasaba a ser la más floja de las tres.
const cambiarPasswordSchema = z
  .object({
    nueva_password: passwordSchema,
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
    console.error('[cambiarPassword] updateUser error:', error.message)
    return { success: false, error: mensajeErrorPassword(error.message) }
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
