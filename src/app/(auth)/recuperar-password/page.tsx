import { RecuperarPasswordForm } from './recuperar-form'
import Link from 'next/link'
import { SparklesIcon } from '@/components/icons'

export const metadata = {
  title: 'Recuperar contraseña — TalentID',
}

export default function RecuperarPasswordPage() {
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
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Recuperar contraseña</h1>
          <p className="mt-1 text-sm text-muted">
            Te enviamos un email para restablecer tu contraseña
          </p>
        </div>
      </div>

      <RecuperarPasswordForm />

      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="font-semibold text-primary-600 hover:underline">
          Volver al inicio de sesión
        </Link>
      </p>
    </div>
  )
}
