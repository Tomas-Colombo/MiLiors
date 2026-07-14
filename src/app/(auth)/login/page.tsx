import { LoginForm } from './login-form'
import { VerificarWidget } from './verificar-widget'
import Link from 'next/link'

export const metadata = {
  title: 'Iniciar sesión — TalentID',
}

export default function LoginPage() {
  return (
    <div className="py-8">
      <div className="mb-8 flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/LogoTalentID.svg"
          alt="TalentID"
          className="h-16 w-16 object-contain"
        />
        <div className="text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Bienvenido de nuevo</h1>
          <p className="mt-1 text-sm text-muted">Ingresá a tu cuenta de TalentID</p>
        </div>
      </div>

      <LoginForm />

      <div className="mt-6 space-y-3 text-center text-sm text-muted">
        <p>
          <Link href="/recuperar-password" className="font-semibold text-primary-600 hover:underline">
            Olvidé mi contraseña
          </Link>
        </p>
        <p>
          ¿No tenés cuenta?{' '}
          <Link href="/registro" className="font-semibold text-primary-600 hover:underline">
            Registrate
          </Link>
        </p>
      </div>

      <VerificarWidget />
    </div>
  )
}
