import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Última milla del flujo de recuperación: acá aterriza el enlace del mail.
 *
 * Supabase valida el token en su propio endpoint y redirige a esta ruta con un
 * `code` en la query. Ese código no es una sesión: hay que canjearlo con
 * `exchangeCodeForSession()`, y el canje escribe las cookies de sesión.
 *
 * Por eso esto es un route handler y no una página. Un Server Component puede
 * leer cookies pero no escribirlas (ver el catch de `createClient()`), así que
 * el canje ahí se perdía en silencio: la sesión de recovery no llegaba nunca al
 * navegador y el formulario de contraseña nueva no tenía a quién actualizar.
 *
 * Cuelga de /recuperar-password/ a propósito: el proxy ya trata todo ese
 * subárbol como público (`startsWith('/recuperar-password/')`), y tiene que
 * serlo — en este punto todavía no hay sesión.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // Sin código no hay nada que canjear: alguien entró a mano a esta URL.
  if (!code) {
    return NextResponse.redirect(new URL('/recuperar-password?error=enlace', origin))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    // Enlace vencido, ya usado, o abierto en un navegador distinto del que pidió
    // el reset (el verificador PKCE vive en una cookie de ese navegador).
    console.error('[recuperar-password/confirmar] exchangeCodeForSession:', error.message)
    return NextResponse.redirect(new URL('/recuperar-password?error=enlace', origin))
  }

  // Las cookies que escribió el canje viajan en esta redirección: Next las toma
  // del store de `cookies()` y las agrega a la respuesta.
  return NextResponse.redirect(new URL('/recuperar-password/nueva', origin))
}
