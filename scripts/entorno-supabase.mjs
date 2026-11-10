/**
 * Cambia el entorno de `next dev` entre el stack local de Supabase y producción.
 *
 *   npm run env:local  → escribe .env.development.local con las claves del
 *                        stack local (`supabase status`). Next lo carga en
 *                        `next dev` por encima de .env.local.
 *   npm run env:prod   → borra .env.development.local; `next dev` vuelve a
 *                        usar .env.local (producción).
 *
 * Solo pisa las variables de Supabase, la URL de la app y el envío de mails.
 * El resto (GEMINI_API_KEY, etc.) sigue saliendo de .env.local.
 * `next build` / `next start` no leen .env.development.local.
 */
import { execSync } from 'node:child_process'
import { existsSync, rmSync, writeFileSync } from 'node:fs'

const ARCHIVO = '.env.development.local'
const modo = process.argv[2]

if (modo === 'prod') {
  if (existsSync(ARCHIVO)) rmSync(ARCHIVO)
  console.log(`Entorno: PRODUCCIÓN (${ARCHIVO} eliminado). Ojo: next dev escribe en la base real.`)
  process.exit(0)
}

if (modo !== 'local') {
  console.error('Uso: node scripts/entorno-supabase.mjs <local|prod>')
  process.exit(1)
}

let salida
try {
  salida = execSync('supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
} catch {
  console.error('El stack local no está corriendo. Levantalo con `supabase start`.')
  process.exit(1)
}

const status = {}
for (const linea of salida.split(/\r?\n/)) {
  const m = linea.match(/^([A-Z_]+)="?(.*?)"?$/)
  if (m) status[m[1]] = m[2]
}

for (const clave of ['API_URL', 'ANON_KEY', 'SERVICE_ROLE_KEY']) {
  if (!status[clave]) {
    console.error(`supabase status no devolvió ${clave}.`)
    process.exit(1)
  }
}

writeFileSync(
  ARCHIVO,
  [
    '# Generado por scripts/entorno-supabase.mjs — stack local de Supabase.',
    '# Borralo (npm run env:prod) para que next dev vuelva a producción.',
    `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=${status.ANON_KEY}`,
    `SUPABASE_SERVICE_ROLE_KEY=${status.SERVICE_ROLE_KEY}`,
    'NEXT_PUBLIC_APP_URL=http://localhost:3000',
    'EMAIL_POSTULACIONES_HABILITADO=false',
    '',
  ].join('\n'),
)
console.log(`Entorno: LOCAL (${status.API_URL}). Mails de Auth en ${status.MAILPIT_URL ?? status.INBUCKET_URL}.`)
