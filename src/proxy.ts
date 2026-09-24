import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { rolDeUsuario, rutaDeRol } from '@/lib/rol'

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

  // Refrescar sesión (obligatorio con @supabase/ssr)
  const {
    data: { user },
  } = await supabase.auth.getUser()

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
  // Se omite en prefetch para no gastar una consulta por cada link precargado.
  // La actividad la actualiza el heartbeat del cliente, no el proxy, así los
  // prefetch/RSC no mantienen viva la sesión sin interacción real del usuario.
  const isPrefetch =
    request.headers.get('next-router-prefetch') === '1' ||
    request.headers.get('purpose') === 'prefetch' ||
    (request.headers.get('sec-purpose')?.includes('prefetch') ?? false)

  if (!isPrefetch) {
    // check_session() devuelve el motivo de cierre ('revocada' | 'inactividad') o null.
    const { data: motivo } = await supabase.rpc('check_session')
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
