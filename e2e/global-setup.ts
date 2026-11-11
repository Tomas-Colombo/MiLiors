import { sembrarDatosE2E } from './support/datos-e2e'
import { ENV_VARS } from './fixtures/auth'

/**
 * Siembra las cuentas fijas en el Supabase local y deja sus credenciales en
 * variables de entorno, que heredan los workers. La contraseña es aleatoria por
 * corrida: no hay credenciales de prueba guardadas en el repo (H-001).
 */
export default async function globalSetup(): Promise<void> {
  const credenciales = await sembrarDatosE2E()
  for (const [rol, { emailKey, passwordKey }] of Object.entries(ENV_VARS)) {
    const cuenta = credenciales[rol as keyof typeof credenciales]
    process.env[emailKey] = cuenta.email
    process.env[passwordKey] = cuenta.password
  }
}
