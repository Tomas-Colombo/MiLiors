import Link from 'next/link'
import { AccesoChrome } from '@/components/acceso/acceso-chrome'
import { RecuperarPasswordForm } from './recuperar-form'

export const metadata = {
  title: 'Recuperar contraseña — MiLiors',
}

/**
 * Comparte la pantalla de acceso con /login, /registro y /verificar. No es una
 * de las tres pestañas —se llega desde "¿La olvidaste?"— así que la fila de
 * pestañas se muestra sin ninguna activa y sirve de vuelta atrás.
 */
export default function RecuperarPasswordPage() {
  return (
    <AccesoChrome>
      <RecuperarPasswordForm />

      <div className="tid-switch">
        ¿Ya la recordaste? <Link href="/login">Volver al inicio de sesión</Link>
      </div>
    </AccesoChrome>
  )
}
