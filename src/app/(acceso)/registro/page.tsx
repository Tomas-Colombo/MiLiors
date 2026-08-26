import Link from 'next/link'
import { AccesoChrome } from '@/components/acceso/acceso-chrome'
import { RegistroForm } from './registro-form'

export const metadata = {
  title: 'Crear cuenta — MiLiors',
}

// Comparte la pantalla de acceso con /iniciar-sesion y /verificar: crear la cuenta es
// la segunda pestaña, no un salto a otra pantalla.
export default function RegistroPage() {
  return (
    <AccesoChrome tab="crear">
      <RegistroForm />

      <div className="tid-switch">
        ¿Ya tienes cuenta? <Link href="/iniciar-sesion">Inicia sesión</Link>
      </div>
    </AccesoChrome>
  )
}
