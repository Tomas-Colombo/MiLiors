import Link from 'next/link'
import { AccesoChrome } from '@/components/acceso/acceso-chrome'
import { RegistroForm } from './registro-form'
import { sanitizarNext } from '@/lib/sanitizar-next'

export const metadata = {
  title: 'Crear cuenta — MiLiors',
}

// Comparte la pantalla de acceso con /iniciar-sesion y /verificar: crear la cuenta es
// la segunda pestaña, no un salto a otra pantalla.
export default async function RegistroPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  // Con destino (venís de un puesto) la cuenta es de postulante y se vuelve al puesto.
  const destino = sanitizarNext(next)

  return (
    <AccesoChrome tab="crear">
      <RegistroForm next={destino} />

      <div className="tid-switch">
        ¿Ya tienes cuenta? <Link href={destino ? `/iniciar-sesion?next=${encodeURIComponent(destino)}` : '/iniciar-sesion'}>
          Inicia sesión
        </Link>
      </div>
    </AccesoChrome>
  )
}
