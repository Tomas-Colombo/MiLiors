import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'

export type CertificadoData = {
  id: string
  postulante_id: string
  url_archivo: string
  timestamp_firma: string
  codigo_qr_url: string | null
  created_at: string
}

/** Último certificado del postulante actual */
export const getUltimoCertificado = cache(async (): Promise<CertificadoData | null> => {
  const session = await verifySession()
  const supabase = await createClient()

  const { data: postulante } = await supabase
    .from('perfil_postulante')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!postulante) return null

  const { data } = await supabase
    .from('certificado_pdf')
    .select('id, postulante_id, url_archivo, timestamp_firma, codigo_qr_url, created_at')
    .eq('postulante_id', (postulante as { id: string }).id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return data ? (data as CertificadoData) : null
})

/** Datos mínimos para verificación pública — NO requiere auth */
export type CertificadoVerificacion = {
  id: string
  timestamp_firma: string
  nombre_completo: string
  eneatipo_numero: number
  eneatipo_nombre: string
}

export async function getCertificadoParaVerificar(id: string): Promise<CertificadoVerificacion | null> {
  // Usar adminClient para que RLS no bloquee la consulta pública
  const admin = createAdminClient()

  const { data: cert } = await admin
    .from('certificado_pdf')
    .select('id, postulante_id, timestamp_firma')
    .eq('id', id)
    .single()

  if (!cert) return null
  const certTyped = cert as { id: string; postulante_id: string; timestamp_firma: string }

  const { data: postulante } = await admin
    .from('perfil_postulante')
    .select('nombre_completo')
    .eq('id', certTyped.postulante_id)
    .single()

  if (!postulante) return null
  const postulanteTyped = postulante as { nombre_completo: string }

  const { data: test } = await admin
    .from('test_eneagrama')
    .select('eneatipo(numero_eneatipo, nombre)')
    .eq('postulante_id', certTyped.postulante_id)
    .single()

  if (!test) return null
  const testTyped = test as { eneatipo: { numero_eneatipo: number; nombre: string } | null }
  if (!testTyped.eneatipo) return null

  return {
    id: certTyped.id,
    timestamp_firma: certTyped.timestamp_firma,
    nombre_completo: postulanteTyped.nombre_completo,
    eneatipo_numero: testTyped.eneatipo.numero_eneatipo,
    eneatipo_nombre: testTyped.eneatipo.nombre,
  }
}
