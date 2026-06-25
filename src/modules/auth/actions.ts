'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { registroSchema, loginSchema, recuperarPasswordSchema } from './schema'
import type { ActionResult } from '@/lib/types/domain'
import { RUTAS_POR_ROL } from '@/lib/constants/enums'
import type { RolUsuario } from '@/lib/types/domain'

// ─── Registro ────────────────────────────────────────────────────────────────
export async function registrarUsuario(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
    rol: formData.get('rol'),
  }

  const parsed = registroSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Revisá los campos del formulario.',
      fieldErrors: {
        ...parsed.error.flatten().fieldErrors as Record<string, string[]>,
        _email: [String(raw.email ?? '')],
      },
    }
  }

  const { email, password, rol } = parsed.data
  const supabase = await createClient()

  // 1. Crear usuario en Supabase Auth con rol en metadata
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { rol },
    },
  })

  if (authError || !authData.user) {
    console.error('[registrarUsuario] Supabase signUp error:', authError)
    if (authError?.status === 429 || authError?.code === 'over_email_send_rate_limit') {
      return { success: false, error: 'Demasiados intentos. Esperá unos minutos antes de volver a intentarlo.' }
    }
    if (authError?.message?.toLowerCase().includes('already registered')) {
      return { success: false, error: 'Ya existe una cuenta con ese email.', fieldErrors: { _email: [email] } }
    }
    if (!authData.user && !authError) {
      return { success: false, error: 'Ya existe una cuenta con ese email.', fieldErrors: { _email: [email] } }
    }
    return { success: false, error: 'No se pudo crear la cuenta. Intentá de nuevo.', fieldErrors: { _email: [email] } }
  }

  // 2. Insertar en tabla usuario (usando admin client para saltear RLS en insert inicial)
  const adminClient = createAdminClient()
  const usuarioRow = { id: authData.user.id, email, rol_usuario: rol as RolUsuario }
  // DB schema is a placeholder — Insert type resolves to never[] until `supabase gen types` runs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: dbError } = await adminClient.from('usuario').insert(usuarioRow as any)

  if (dbError) {
    // Limpiar usuario de auth si falla la inserción en DB
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return { success: false, error: 'Error al crear el perfil. Contactá soporte.' }
  }

  // 3. Redirigir al onboarding del rol
  redirect(RUTAS_POR_ROL[rol] + '/onboarding')
}

// ─── Login ───────────────────────────────────────────────────────────────────
export async function iniciarSesion(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Revisá los campos del formulario.',
      fieldErrors: {
        ...parsed.error.flatten().fieldErrors as Record<string, string[]>,
        _email: [String(raw.email ?? '')],
      },
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error || !data.user) {
    if (error?.message?.toLowerCase().includes('email not confirmed')) {
      return { success: false, error: 'Confirmá tu email antes de ingresar. Revisá tu bandeja de entrada.', fieldErrors: { _email: [parsed.data.email] } }
    }
    return { success: false, error: 'Email o contraseña incorrectos.', fieldErrors: { _email: [parsed.data.email] } }
  }

  const rol = data.user.user_metadata?.rol as RolUsuario | undefined
  if (!rol || !RUTAS_POR_ROL[rol]) {
    return { success: false, error: 'Cuenta con configuración incorrecta. Contactá soporte.' }
  }

  revalidatePath('/', 'layout')
  redirect(RUTAS_POR_ROL[rol])
}

// ─── Logout ──────────────────────────────────────────────────────────────────
export async function cerrarSesion(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

// ─── Recuperar contraseña ────────────────────────────────────────────────────
export async function recuperarPassword(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = { email: formData.get('email') }
  const parsed = recuperarPasswordSchema.safeParse(raw)

  if (!parsed.success) {
    return {
      success: false,
      error: 'Ingresá un email válido.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/recuperar-password/nueva`,
  })

  // No revelar si el email existe o no (seguridad)
  if (error) {
    console.error('Error al enviar email de recuperación:', error.message)
  }

  return {
    success: true,
    data: undefined,
  }
}

// ─── Aceptar TyC ─────────────────────────────────────────────────────────────
export async function aceptarTyC(tycId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'No autenticado.' }
  }

  const aceptacionRow = { usuario_id: user.id, tyc_id: tycId }
  // DB schema is a placeholder — Insert type resolves to never[] until `supabase gen types` runs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await supabase.from('aceptacion_tyc').insert(aceptacionRow as any)

  if (error) {
    if (error.code === '23505') {
      // Ya aceptó esta versión — no es un error real
      return { success: true, data: undefined }
    }
    return { success: false, error: 'No se pudo registrar la aceptación.' }
  }

  revalidatePath('/', 'layout')
  return { success: true, data: undefined }
}
