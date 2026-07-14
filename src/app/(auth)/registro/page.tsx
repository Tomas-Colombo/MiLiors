import { RegistroForm } from './registro-form'
import Link from 'next/link'

export const metadata = {
  title: 'Crear cuenta — TalentID',
}

export default function RegistroPage() {
  return (
    <div className="py-8">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/LogoTalentID.svg"
          alt="TalentID"
          className="h-16 w-16 object-contain"
        />
        <div className="text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">Crear cuenta</h1>
          <p className="mt-1 text-sm text-muted">Elegí tu tipo de cuenta para comenzar</p>
        </div>
      </div>

      <RegistroForm />

      <p className="mt-6 text-center text-sm text-muted">
        ¿Ya tenés cuenta?{' '}
        <Link href="/login" className="font-semibold text-primary-600 hover:underline">
          Iniciá sesión
        </Link>
      </p>
    </div>
  )
}
