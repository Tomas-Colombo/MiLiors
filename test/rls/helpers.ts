import { execSync } from 'node:child_process'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'

export const PASSWORD = 'TestPassword123!'

export function getSupabaseEnv() {
  const output = execSync('supabase status -o env', { encoding: 'utf8' })
  const env: Record<string, string> = {}
  for (const line of output.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)="?(.*?)"?$/)
    if (m) env[m[1]] = m[2]
  }

  const apiUrl = env.API_URL
  const anonKey = env.ANON_KEY
  const serviceRoleKey = env.SERVICE_ROLE_KEY

  if (!apiUrl || !anonKey || !serviceRoleKey) {
    throw new Error('No se pudieron obtener las credenciales de supabase status -o env')
  }

  const url = new URL(apiUrl)
  if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
    throw new Error(`ABORTANDO: API_URL host (${url.hostname}) no es 127.0.0.1 ni localhost!`)
  }

  return { apiUrl, anonKey, serviceRoleKey }
}

const { apiUrl, anonKey, serviceRoleKey } = getSupabaseEnv()

export { apiUrl, anonKey, serviceRoleKey }

export const adminClient: SupabaseClient<Database> = createClient<Database>(apiUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export const anonClient: SupabaseClient<Database> = createClient<Database>(apiUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export async function createAuthenticatedClient(email: string, password = PASSWORD) {
  const authClient = createClient(apiUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data, error } = await authClient.auth.signInWithPassword({ email, password })
  if (error || !data.session) {
    throw new Error(`Error al autenticar ${email}: ${error?.message}`)
  }

  const userClient = createClient<Database>(apiUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
      },
    },
  })
  return { client: userClient, session: data.session }
}
