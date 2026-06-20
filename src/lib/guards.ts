import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from './dal'

/**
 * Guard para el flujo de onboarding del postulante.
 * Uso: llamar desde cualquier page del postulante que requiera Eneagrama completo.
 * - Si no tiene perfil básico → /postulante/onboarding
 * - Si no tiene Eneagrama completo → /postulante/eneagrama
 */
export async function requireEneagramaCompleto() {
  const session = await verifySession()
  if (session.rol !== 'POSTULANTE') return

  const supabase = await createClient()

  // Verificar perfil básico
  const { data: perfil } = await supabase
    .from('perfil_postulante')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!perfil) {
    redirect('/postulante/onboarding')
  }

  // Verificar Eneagrama completado
  const { data: test } = await supabase
    .from('test_eneagrama')
    .select('eneatipo_id')
    .eq('postulante_id', (perfil as { id: string }).id)
    .single()

  if (!test || !(test as { eneatipo_id: string | null }).eneatipo_id) {
    redirect('/postulante/eneagrama')
  }
}
