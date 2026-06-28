import { LoginForm } from './login-form'
import { VerificarWidget } from './verificar-widget'
import Link from 'next/link'
import { SparklesIcon } from '@/components/icons'

export const metadata = {
  title: 'Iniciar sesión — TalentID',
}

export default function LoginPage() {
  return (
    <div className="py-8">
      <div className="mb-8 flex flex-col items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-[14px] shadow-primary"
          style={{ background: 'var(--gradient-brand-soft)' }}
        >
          <SparklesIcon size={24} className="text-white" />
        </div>
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
