import Link from 'next/link'
import { AccesoChrome } from '@/components/acceso/acceso-chrome'
import { RecuperarPasswordForm } from './recuperar-form'

export const metadata = {
  title: 'Recuperar contraseña — MiLiors',
}

/**
 * Comparte la pantalla de acceso con /iniciar-sesion, /registro y /verificar.
 * No es una de las tres pestañas —se llega desde "¿La olvidaste?"— así que la
 * fila de pestañas se muestra sin ninguna activa y sirve de vuelta atrás.
 */
export default async function RecuperarPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  // `error=enlace` lo pone el paso de confirmación cuando el código del mail no
  // sirve: venció, ya se usó, o el enlace se abrió en otro navegador (el
  // verificador PKCE quedó en una cookie del navegador que pidió el reset).
  const { error } = await searchParams
  const avisoEnlace = error === 'enlace'

  return (
    <AccesoChrome>
      {avisoEnlace && (
        <div className="tid-alert">
          Ese enlace ya no sirve: vence a la hora, se usa una sola vez y hay que abrirlo en el
          mismo navegador desde el que lo pediste. Pedí uno nuevo acá abajo.
        </div>
      )}

      <RecuperarPasswordForm />

      <div className="tid-switch">
        ¿Ya la recordaste? <Link href="/iniciar-sesion">Volver al inicio de sesión</Link>
      </div>
    </AccesoChrome>
  )
}
