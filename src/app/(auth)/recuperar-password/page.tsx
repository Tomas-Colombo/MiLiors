import { RecuperarPasswordForm } from './recuperar-form'
import Link from 'next/link'

export const metadata = {
  title: 'Recuperar contraseña — TalentID',
}

export default function RecuperarPasswordPage() {
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
