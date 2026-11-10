import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import { getEnvServidor } from '@/lib/env'

// SOLO usar en Route Handlers o Server Actions con verificación de rol ADMIN
export function createAdminClient() {
  const env = getEnvServidor()

  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
