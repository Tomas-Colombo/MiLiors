import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { rolDeUsuario, rutaDeRol } from '@/lib/rol'
import { getUsuarioAutenticado } from '@/lib/supabase/claims'
import { checkSessionCacheado } from '@/lib/session/check-session-cache'

// Rutas que NO requieren autenticación
const PUBLIC_PATHS = [
  '/iniciar-sesion',
  '/registro',
  '/recuperar-password',
  '/verificar', // verificación pública de certificados
]

// Rutas que requieren rol específico (prefijo)
const ROLE_PATHS: Record<string, string> = {
  '/postulante': 'POSTULANTE',
  '/reclutador': 'RECLUTADOR',
  '/admin': 'ADMIN',
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Crear cliente Supabase para leer la sesión desde cookies
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refrescar sesión (obligatorio con @supabase/ssr). getClaims() verifica el
  // JWT localmente: no consulta a Supabase Auth en cada request.
  const user = await getUsuarioAutenticado(supabase)

  // Si la ruta es pública, continuar
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  )
  if (isPublic) {
    // Si el usuario ya está logueado y va al login/registro, redirigir al dashboard de su rol.
    // Sólo en navegaciones (GET): una server action es un POST que espera su
    // propia respuesta, y si recibe un redirect del proxy el cliente de Next
    // falla con "An unexpected response was received from the server". La
    // acción de login ya redirige sola al panel del rol.
    if (user && request.method === 'GET' && (pathname === '/iniciar-sesion' || pathname === '/registro')) {
      const destino = rutaDeRol(rolDeUsuario(user))
      // Sin rol utilizable no hay adónde mandarlo: se lo deja ver la pantalla
      // de acceso en lugar de redirigir /iniciar-sesion → /iniciar-sesion, que
      // es un bucle de redirección.
      if (destino) return NextResponse.redirect(new URL(destino, request.url))
    }
    return response
  }

  // Si la ruta es protegida y no hay sesión, redirigir al login
  if (!user) {
    return NextResponse.redirect(new URL('/iniciar-sesion', request.url))
  }

  // ─── Política de sesión: revocación (todos) + inactividad (admin) ───────────
  // La actividad la actualiza el heartbeat del cliente, no el proxy, así los
  // prefetch/RSC no mantienen viva la sesión sin interacción real del usuario.
  //
  // Los prefetch de <Link> NO se pueden detectar acá: Next borra los headers
  // RSC (`next-router-prefetch`, `rsc`, …) y el parámetro `_rsc` antes de
  // ejecutar el proxy (next/dist/server/web/adapter.js). Un sidebar de 7 links
  // dispara ~15 requests al cargar; los absorbe el cache de check_session.
  // Sólo se omiten los prefetch del navegador (speculation rules / <link rel=prefetch>).
  const isPrefetch =
    request.headers.get('purpose') === 'prefetch' ||
    (request.headers.get('sec-purpose')?.includes('prefetch') ?? false)

  if (!isPrefetch) {
    // check_session() devuelve el motivo de cierre ('revocada' | 'inactividad') o null.
    // Cacheado por usuario (ver check-session-cache.ts). Si la RPC falla se deja
    // pasar, como antes, y no se cachea.
    const motivo = await checkSessionCacheado(user.id, async () => {
      const { data, error } = await supabase.rpc('check_session')
      if (error) throw error
      return data
    }).catch(() => null)
    if (motivo) {
      await supabase.auth.signOut()
      const cierre = NextResponse.redirect(new URL(`/iniciar-sesion?motivo=${motivo}`, request.url))
      // Propagar las cookies de limpieza de sesión que signOut() escribió en `response`.
      response.cookies.getAll().forEach((cookie) => cierre.cookies.set(cookie))
      return cierre
    }
  }

  // Verificar rol para rutas de rol específico
  const rol = rolDeUsuario(user)
  for (const [prefix, requiredRole] of Object.entries(ROLE_PATHS)) {
    if (pathname.startsWith(prefix)) {
      if (rol !== requiredRole) {
        // Al dashboard del rol correcto; sin rol utilizable, al login.
        const destino = rutaDeRol(rol) ?? '/iniciar-sesion'
        return NextResponse.redirect(new URL(destino, request.url))
      }
      break
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Ejecutar en todas las rutas excepto:
     * - assets estáticos (_next/static, _next/image, favicon, etc.)
     * - archivos con extensión (imágenes, fuentes, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
}
