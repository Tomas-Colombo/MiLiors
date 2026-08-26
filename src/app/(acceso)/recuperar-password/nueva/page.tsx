import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AccesoChrome } from '@/components/acceso/acceso-chrome'
import { createClient } from '@/lib/supabase/server'
import { NuevaPasswordForm } from './nueva-password-form'

export const metadata = {
  title: 'Elegir contraseña nueva — MiLiors',
}

/**
 * Segundo paso del flujo de recuperación. Sólo se llega desde
 * /recuperar-password/confirmar, que ya canjeó el código del mail por sesión.
 *
 * Comparte la pantalla de acceso con el resto del grupo y, como
 * /recuperar-password, no marca ninguna pestaña: no es una de las tres puertas
 * de entrada, es un paso intermedio.
 */
export default async function NuevaPasswordPage() {
  // Sin sesión de recovery no hay a quién cambiarle la contraseña. Pasa cuando
  // se entra a mano a esta URL, o cuando el enlace ya se usó. Se devuelve al
  // primer paso con el aviso en vez de mostrar un formulario que no puede
  // guardar nada.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/recuperar-password?error=enlace')
  }

  return (
    <AccesoChrome>
      <div className="tid-alert tid-alert-info">
        Verificamos el enlace de <strong>{user.email}</strong>. Elegí una contraseña nueva para
        terminar.
      </div>

      <NuevaPasswordForm />

      <div className="tid-switch">
        ¿Te acordaste de la anterior? <Link href="/iniciar-sesion">Volver al inicio de sesión</Link>
      </div>
    </AccesoChrome>
  )
}
