import { AccesoChrome } from '@/components/acceso/acceso-chrome'
import { VerifyForm } from './verify-form'

export const metadata = {
  title: 'Verificar un certificado — MiLiors',
  description:
    'Comprueba que un certificado emitido por MiLiors es auténtico ingresando su ID de verificación.',
}

// Ruta pública: no requiere sesión. Comparte la pantalla de acceso con /login
// —es la tercera pestaña— para que verificar un certificado sea también una
// puerta de entrada a la aplicación.
export default function VerificarBuscadorPage() {
  return (
    <AccesoChrome tab="verificar">
      <VerifyForm />
    </AccesoChrome>
  )
}
