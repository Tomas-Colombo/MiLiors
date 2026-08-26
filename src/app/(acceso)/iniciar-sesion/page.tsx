import Link from 'next/link'
import { AccesoChrome } from '@/components/acceso/acceso-chrome'
import { IniciarSesionForm } from './iniciar-sesion-form'

export const metadata = {
  title: 'Iniciar sesión — MiLiors',
}

// Por qué la persona aterrizó acá con la sesión cerrada: los dos primeros son
// cierres de la política de sesión; el tercero es el final feliz del flujo de
// recuperación, que cierra la sesión de recovery a propósito.
const MOTIVO_MENSAJE: Record<string, string> = {
  inactividad: 'Cerramos tu sesión por inactividad. Vuelve a ingresar.',
  revocada: 'Un administrador finalizó tu sesión. Vuelve a ingresar.',
  'password-actualizada': 'Tu contraseña quedó actualizada. Ingresá con la nueva.',
}

export default async function IniciarSesionPage({
  searchParams,
}: {
  searchParams: Promise<{ motivo?: string }>
}) {
  const { motivo } = await searchParams
  const aviso = motivo ? MOTIVO_MENSAJE[motivo] : undefined

  return (
    <AccesoChrome tab="ingresar">
      {aviso && <div className="tid-alert tid-alert-info">{aviso}</div>}

      <IniciarSesionForm />

      <div className="tid-switch">
        ¿No tienes cuenta? <Link href="/registro">Créala aquí</Link>
      </div>
    </AccesoChrome>
  )
}
