import { execSync } from 'node:child_process'

/**
 * Guard contra producción para la suite E2E (H-002).
 *
 * Los specs escriben en la base: crean usuarios, puestos, postulaciones y notas.
 * Antes de este guard, la app bajo prueba tomaba la base de los archivos .env, que
 * podían apuntar a producción. Ahora la suite solo corre contra el stack local de
 * Supabase (Docker): las credenciales salen de `supabase status`, se verifica que
 * el host sea local y se le pasan explícitamente al servidor que levanta Playwright.
 */

/** Referencia del proyecto productivo: si aparece en una URL, se aborta. */
const PROYECTO_PRODUCCION = 'abhfueuhriqrtpdtdvzd'
const HOSTS_LOCALES = new Set(['127.0.0.1', 'localhost', '[::1]'])

export type EntornoSupabaseLocal = {
  apiUrl: string
  anonKey: string
  serviceRoleKey: string
}

/** Lanza si `valor` no es una URL de la máquina local o menciona el proyecto productivo. */
export function assertUrlLocal(nombre: string, valor: string): void {
  let host: string
  try {
    host = new URL(valor).hostname
  } catch {
    throw new Error(`E2E abortado: ${nombre} no es una URL válida.`)
  }
  if (!HOSTS_LOCALES.has(host) || valor.includes(PROYECTO_PRODUCCION)) {
    throw new Error(
      `E2E abortado: ${nombre} apunta a "${host}". La suite solo corre contra el entorno local.`
    )
  }
}

// La config se carga en el proceso principal y en cada worker: se lee una sola vez
// y se reparte por variables de entorno, que los workers heredan.
const CLAVE_URL = 'E2E_SUPABASE_API_URL'
const CLAVE_ANON = 'E2E_SUPABASE_ANON_KEY'
const CLAVE_SERVICE = 'E2E_SUPABASE_SERVICE_ROLE_KEY'

function leerSupabaseStatus(): EntornoSupabaseLocal {
  let salida: string
  try {
    salida = execSync('supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  } catch {
    throw new Error('E2E abortado: el stack local de Supabase no responde. Levantalo con `supabase start`.')
  }
  const env: Record<string, string> = {}
  for (const linea of salida.split(/\r?\n/)) {
    const m = linea.match(/^([A-Z_]+)="?(.*?)"?$/)
    if (m) env[m[1]] = m[2]
  }
  if (!env.API_URL || !env.ANON_KEY || !env.SERVICE_ROLE_KEY) {
    throw new Error('E2E abortado: `supabase status` no devolvió las credenciales del stack local.')
  }
  return { apiUrl: env.API_URL, anonKey: env.ANON_KEY, serviceRoleKey: env.SERVICE_ROLE_KEY }
}

/** Credenciales del Supabase local, verificadas como locales. Lanza si no lo son. */
export function leerEntornoLocal(): EntornoSupabaseLocal {
  const yaLeido = process.env[CLAVE_URL] && process.env[CLAVE_ANON] && process.env[CLAVE_SERVICE]
  const entorno = yaLeido
    ? {
        apiUrl: process.env[CLAVE_URL]!,
        anonKey: process.env[CLAVE_ANON]!,
        serviceRoleKey: process.env[CLAVE_SERVICE]!,
      }
    : leerSupabaseStatus()

  assertUrlLocal('API_URL de Supabase', entorno.apiUrl)

  process.env[CLAVE_URL] = entorno.apiUrl
  process.env[CLAVE_ANON] = entorno.anonKey
  process.env[CLAVE_SERVICE] = entorno.serviceRoleKey
  return entorno
}
