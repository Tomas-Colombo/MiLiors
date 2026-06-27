'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import type { ActionResult } from '@/lib/types/domain'
import { ESTADO_POSTULACION_LABEL } from '@/lib/constants/enums'

// Helper: send email via Resend (no SDK — native fetch)
async function enviarEmailCambioEstado(
  emailDestino: string,
  nombrePostulante: string,
  tituloPuesto: string,
  empresaNombre: string,
  nuevoEstado: string
) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[postulaciones] RESEND_API_KEY not configured. Email not sent.')
    return
  }

  const estadoLabel = ESTADO_POSTULACION_LABEL[nuevoEstado] ?? nuevoEstado

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'TalentID <notificaciones@talentid.com.ar>',
        to: emailDestino,
        subject: `Actualización en tu postulación — ${tituloPuesto}`,
        html: `
          <p>Hola ${nombrePostulante},</p>
          <p>Tu postulación al puesto <strong>${tituloPuesto}</strong> en <strong>${empresaNombre}</strong> fue actualizada.</p>
          <p><strong>Estado actual:</strong> ${estadoLabel}</p>
          <p>Ingresá a <a href="${process.env.NEXT_PUBLIC_APP_URL}/postulante/postulaciones">TalentID</a> para ver el detalle.</p>
          <p>— El equipo de TalentID</p>
        `,
      }),
    })
    if (!res.ok) {
      console.error('[postulaciones] Resend error:', res.status, await res.text())
    }
  } catch (err) {
    console.error('[postulaciones] Error sending email:', err)
  }
}

// Helper: fetch data needed for the notification email
async function getDatosEmail(postulacionId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('postulacion')
    .select(`
      estado,
      perfil_postulante(nombre_completo, usuario(email)),
      puesto(titulo_puesto, empresa(nombre_empresa))
    `)
    .eq('id', postulacionId)
    .single()

  if (!data) return null
  const d = data as {
    estado: string
    perfil_postulante: { nombre_completo: string; usuario: { email: string } | null } | null
    puesto: { titulo_puesto: string; empresa: { nombre_empresa: string } | null } | null
  }

  return {
    email: d.perfil_postulante?.usuario?.email ?? null,
    nombre: d.perfil_postulante?.nombre_completo ?? 'Candidato',
    titulo: d.puesto?.titulo_puesto ?? 'Puesto',
    empresa: d.puesto?.empresa?.nombre_empresa ?? 'Empresa',
    estado: d.estado,
  }
}

export async function postularAPuesto(puestoId: string): Promise<ActionResult> {
  const session = await verifySession()
  const supabase = await createClient()

  const { data: postulante } = await supabase
    .from('perfil_postulante')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!postulante) return { success: false, error: 'Perfil no encontrado.' }

  const postulanteId = (postulante as { id: string }).id
  const admin = createAdminClient()

  // Guard: must have a valid (non-stale) certificate to apply
  const { data: cert } = await supabase
    .from('certificado_pdf')
    .select('id, desactualizado')
    .eq('postulante_id', postulanteId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!cert) {
    return { success: false, error: 'Necesitás generar tu certificado de perfil antes de postularte.' }
  }
  if ((cert as { desactualizado: boolean }).desactualizado) {
    return { success: false, error: 'Tu certificado está desactualizado. Generá uno nuevo antes de postularte.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('postulacion') as any).insert({
    postulante_id: postulanteId,
    puesto_id: puestoId,
    estado: 'ENVIADA',
  })

  if (error) {
    if (error.code === '23505') return { success: false, error: 'Ya postulaste a este puesto.' }
    return { success: false, error: 'No se pudo registrar la postulación.' }
  }

  revalidatePath('/postulante/puestos')
  revalidatePath('/postulante/postulaciones')
  return { success: true, data: undefined }
}

export async function avanzarEstadoPostulacion(
  postulacionId: string,
  nuevoEstado: 'VISTO' | 'PROCESO_FINALIZADO'
): Promise<ActionResult> {
  const session = await verifySession()
  const supabase = await createClient()

  // Verify the recruiter owns the post
  const { data: reclutador } = await supabase
    .from('perfil_reclutador')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!reclutador) return { success: false, error: 'No autorizado.' }

  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('postulacion') as any)
    .update({ estado: nuevoEstado })
    .eq('id', postulacionId)

  if (error) return { success: false, error: 'No se pudo actualizar el estado.' }

  // Send email (non-blocking: failure is logged but doesn't halt)
  const datos = await getDatosEmail(postulacionId)
  if (datos?.email) {
    await enviarEmailCambioEstado(datos.email, datos.nombre, datos.titulo, datos.empresa, nuevoEstado)
  }

  revalidatePath('/reclutador/postulaciones')
  return { success: true, data: undefined }
}

export async function toggleFavoritoPostulacion(
  postulacionId: string,
  isFavorito: boolean,
): Promise<ActionResult> {
  const session = await verifySession()
  const supabase = await createClient()

  // Verify the recruiter owns the application via their posts
  const { data: reclutador } = await supabase
    .from('perfil_reclutador')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!reclutador) return { success: false, error: 'No autorizado.' }

  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('postulacion') as any)
    .update({ is_favorito: isFavorito })
    .eq('id', postulacionId)

  if (error) return { success: false, error: 'No se pudo actualizar favorito.' }

  revalidatePath('/reclutador/postulaciones')
  return { success: true, data: undefined }
}
