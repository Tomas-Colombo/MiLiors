import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Marca actividad de la sesión actual. Lo consume el watcher de inactividad del
// cliente (sólo admin) ante interacción real del usuario. El throttle vive en la
// RPC touch_session_activity() (no escribe si la última actividad fue < 60 s).
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })

  await supabase.rpc('touch_session_activity')

  return new NextResponse(null, { status: 204 })
}
