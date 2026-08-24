import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { SessionUser } from '@/lib/types/domain'
import { rolDeUsuario } from './rol'

/**
 * Verifica la sesión actual. Si no hay sesión, redirige a /login.
 * Memoizada por React cache() durante el render pass.
 */
export const verifySession = cache(async (): Promise<SessionUser> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const rol = rolDeUsuario(user)
  if (!rol) {
    redirect('/login')
  }

  return {
    id: user.id,
    email: user.email!,
    rol,
  }
})

/**
 * Obtiene la sesión actual sin redirigir. Retorna null si no hay sesión.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const rol = rolDeUsuario(user)
  if (!rol) return null

  return {
    id: user.id,
    email: user.email!,
    rol,
  }
})

/**
 * Obtiene la TyC vigente (sin baja) y verifica si el usuario la aceptó.
 * Retorna null si no hay TyC vigente.
 */
export const getTyCStatus = cache(async () => {
  const supabase = await createClient()

  type TyCRow = {
    id: string
    version: string
    descripcion: string
    fecha_publicacion: string
  }

  // Obtener la TyC vigente más reciente
  const { data: tycRaw } = await supabase
    .from('terminos_y_condiciones')
    .select('id, version, descripcion, fecha_publicacion')
    .is('fecha_baja_tyc', null)
    .order('fecha_publicacion', { ascending: false })
    .limit(1)
    .single()

  if (!tycRaw) return null
  const tyc = tycRaw as unknown as TyCRow

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { tyc, aceptada: false }

  const { data: aceptacion } = await supabase
    .from('aceptacion_tyc')
    .select('id')
    .eq('usuario_id', user.id)
    .eq('tyc_id', tyc.id)
    .single()

  return { tyc, aceptada: !!aceptacion }
})

/**
 * Obtiene solo la TyC vigente (sin baja), sin evaluar aceptación.
 * Útil para el acceso directo de lectura desde configuración. Retorna null si no hay.
 */
export const getTyCVigente = cache(async () => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('terminos_y_condiciones')
    .select('id, version, descripcion, fecha_publicacion')
    .is('fecha_baja_tyc', null)
    .order('fecha_publicacion', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data as unknown as {
    id: string
    version: string
    descripcion: string
    fecha_publicacion: string
  } | null
})
