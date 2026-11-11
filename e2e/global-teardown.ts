import { limpiarDatosE2E } from './support/datos-e2e'

/** Deja el Supabase local como estaba: borra las cuentas E2E y lo que generaron. */
export default async function globalTeardown(): Promise<void> {
  await limpiarDatosE2E()
}
