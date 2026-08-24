import Link from 'next/link'
import { AccesoChrome } from '@/components/acceso/acceso-chrome'
import { LoginForm } from './login-form'

export const metadata = {
  title: 'Iniciar sesión — MiLiors',
}

// Motivos por los que la política de sesión pudo haber cerrado la sesión.
const MOTIVO_MENSAJE: Record<string, string> = {
  inactividad: 'Cerramos tu sesión por inactividad. Vuelve a ingresar.',
  revocada: 'Un administrador finalizó tu sesión. Vuelve a ingresar.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ motivo?: string }>
}) {
  const { motivo } = await searchParams
  const aviso = motivo ? MOTIVO_MENSAJE[motivo] : undefined

  return (
    <AccesoChrome tab="ingresar">
      {aviso && <div className="tid-alert tid-alert-info">{aviso}</div>}

      <LoginForm />

      <div className="tid-switch">
        ¿No tienes cuenta? <Link href="/registro">Créala aquí</Link>
      </div>
    </AccesoChrome>
  )
}
