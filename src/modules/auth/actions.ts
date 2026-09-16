'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { registroSchema, loginSchema, recuperarPasswordSchema, nuevaPasswordSchema } from './schema'
import type { RegistroPendiente } from './schema'
import { mensajeErrorPassword } from './password-error'
import { resultadoAltaPerfil } from './alta-perfil'
import type { ActionResult } from '@/lib/types/domain'
import { RUTAS_POR_ROL } from '@/lib/constants/enums'
import { rolDeUsuario } from '@/lib/rol'
import { appUrl } from '@/lib/app-url'
import type { RolUsuario } from '@/lib/types/domain'
import type { TablesInsert } from '@/lib/types/database.types'

// ─── Registro ────────────────────────────────────────────────────────────────
export async function registrarUsuario(
  _prevState: ActionResult<RegistroPendiente>,
  formData: FormData
): Promise<ActionResult<RegistroPendiente>> {
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

  // 1. Crear el usuario en Supabase Auth.
  // El rol NO va acá: `options.data` escribe en user_metadata, que el propio
  // usuario puede reescribir después desde el navegador. El rol se guarda en el
  // paso 2 y de ahí lo propaga a app_metadata el trigger de la DB (ver
  // 20260824000002_rol_no_editable.sql y src/lib/rol.ts).
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
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

  // Email ya registrado y CONFIRMADO: por la protección contra enumeración,
  // Supabase no devuelve error ni manda mail, sino un usuario ficticio sin
  // identidades. Sin este corte se mostraba "te enviamos un mail" que nunca llega.
  // (Un email registrado SIN confirmar sí trae identidades: Supabase reenvía el
  // mail y se sigue el flujo normal, ver alta-perfil.ts.)
  if (authData.user.identities?.length === 0) {
    return { success: false, error: 'Ya existe una cuenta con ese email.', fieldErrors: { _email: [email] } }
  }

  // 2. Insertar en tabla usuario (usando admin client para saltear RLS en insert inicial)
  const adminClient = createAdminClient()
  const usuarioRow: TablesInsert<'usuario'> = {
    id: authData.user.id,
    email,
    rol_usuario: rol as RolUsuario,
  }
  const { error: dbError } = await adminClient.from('usuario').insert(usuarioRow)

  // 'ya-existia' = reintento sobre una cuenta sin confirmar: se sigue de largo
  // sin borrar nada (ver alta-perfil.ts). El rol queda el del primer registro.
  if (resultadoAltaPerfil(dbError) === 'fallo') {
    console.error('[registrarUsuario] usuario insert error:', dbError)
    // Limpiar usuario de auth si falla la inserción en DB
    await adminClient.auth.admin.deleteUser(authData.user.id)
    return { success: false, error: 'Error al crear el perfil. Contactá soporte.' }
  }

  // 3. Sin sesión no se puede entrar al onboarding.
  // Con la confirmación de email activada, signUp() no emite token: manda el
  // mail y devuelve `session: null`. Redirigir igual al panel del rol hacía que
  // el proxy no viera usuario y rebotara a la pantalla de acceso sin decir una
  // palabra — la persona quedaba mirando el formulario de ingreso sin saber que
  // su cuenta existe y que tiene un mail esperando. Se devuelve el aviso y lo
  // muestra el formulario.
  if (!authData.session) {
    return { success: true, data: { email } }
  }

  // Confirmación desactivada en el proyecto de Supabase: ya hay sesión, así que
  // se entra derecho al onboarding del rol.
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

  const rol = rolDeUsuario(data.user)
  if (!rol || !RUTAS_POR_ROL[rol]) {
    return { success: false, error: 'Cuenta con configuración incorrecta. Contactá soporte.' }
  }

  // Update last login timestamp on the role profile (fire-and-forget: failure doesn't block login)
  // Las dos ramas se escriben aparte porque `.from()` necesita el nombre de la
  // tabla como literal para resolver el tipo de la fila.
  const admin = createAdminClient()
  const ultimaConexion = { ultima_conexion: new Date().toISOString() }
  await (rol === 'POSTULANTE'
    ? admin.from('perfil_postulante').update(ultimaConexion).eq('usuario_id', data.user.id)
    : admin.from('perfil_reclutador').update(ultimaConexion).eq('usuario_id', data.user.id))

  // Reiniciar el estado de sesión: arranca el reloj de inactividad y limpia una
  // revocación previa (así un usuario revocado puede volver a entrar).
  await admin.from('sesion_actividad').upsert({
    usuario_id: data.user.id,
    ultima_actividad: new Date().toISOString(),
    revocada: false,
    actualizado_en: new Date().toISOString(),
  })

  revalidatePath('/', 'layout')
  redirect(RUTAS_POR_ROL[rol])
}

// ─── Logout ──────────────────────────────────────────────────────────────────
export async function cerrarSesion(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/iniciar-sesion')
}

// Cierre disparado por el watcher de inactividad del cliente (sólo admin).
// Usa el signOut() nativo; el motivo alimenta el aviso en el login.
export async function cerrarSesionPorInactividad(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/iniciar-sesion?motivo=inactividad')
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

  // El enlace del mail no puede apuntar directo a la pantalla del formulario:
  // Supabase vuelve con un `code` que hay que canjear por sesión, y eso sólo se
  // puede hacer donde se pueden escribir cookies — un route handler, nunca un
  // Server Component. Por eso el destino es /recuperar-password/confirmar, que
  // canjea y recién ahí manda a /recuperar-password/nueva.
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: appUrl('/recuperar-password/confirmar'),
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

// ─── Contraseña nueva (última milla del flujo de recuperación) ───────────────
/**
 * Escribe la contraseña nueva y cierra la sesión de recovery.
 *
 * Lo que autoriza este cambio es la sesión que dejó el enlace del mail, no un
 * campo del formulario: por eso no se pide la contraseña anterior. Si no hay
 * sesión, el enlace venció o ya se usó.
 *
 * Termina con signOut() a propósito. La sesión de recovery entra por una puerta
 * que no ejecuta nada de la contabilidad que sí hace `iniciarSesion`
 * (ultima_conexion, y el upsert de sesion_actividad que limpia `revocada`).
 * Dejarla pasar al panel sería entrar a la app a medio inicializar. Que vuelva
 * a ingresar cuesta un paso más y estrena la contraseña nueva.
 */
export async function establecerPasswordNueva(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = nuevaPasswordSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!parsed.success) {
    return {
      success: false,
      error: 'Revisá los campos del formulario.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      success: false,
      error: 'El enlace venció o ya se usó. Pedí uno nuevo desde "¿La olvidaste?".',
    }
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })

  if (error) {
    console.error('[establecerPasswordNueva] updateUser error:', error.message)
    return { success: false, error: mensajeErrorPassword(error.message) }
  }

  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/iniciar-sesion?motivo=password-actualizada')
}

// ─── Aceptar TyC ─────────────────────────────────────────────────────────────
export async function aceptarTyC(tycId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'No autenticado.' }
  }

  const aceptacionRow: TablesInsert<'aceptacion_tyc'> = { usuario_id: user.id, tyc_id: tycId }
  const { error } = await supabase.from('aceptacion_tyc').insert(aceptacionRow)

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
