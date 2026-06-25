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

  // Verificar Eneagrama completado: debe existir al menos un dominante
  const { data: test } = await supabase
    .from('test_eneagrama')
    .select('id, test_eneagrama_dominante(id)')
    .eq('postulante_id', (perfil as { id: string }).id)
    .single()

  const testTyped = test as { id: string; test_eneagrama_dominante: { id: string }[] } | null
  if (!testTyped || testTyped.test_eneagrama_dominante.length === 0) {
    redirect('/postulante/eneagrama')
  }
}
