'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import type { ActionResult } from '@/lib/types/domain'
import { ESTADO_POSTULACION_LABEL, TIPO_PREGUNTA_PRESELECTOR } from '@/lib/constants/enums'
import { getFormularioDePuesto } from '@/modules/preselector/queries'
import { evaluarRespuestasCriticas, construirMotivoDescarte } from '@/modules/preselector/evaluador'
import { marcarActividadPuesto } from '@/modules/puestos/actividad'
import { getCicloAbierto } from '@/modules/puestos/ciclos'

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

// Helper: resolve the current applicant's profile and verify their certificate
// is valid (present and non-stale). Shared by both application flows.
async function verificarPostulanteConCertificado(
  supabase: Awaited<ReturnType<typeof createClient>>,
  usuarioId: string,
): Promise<{ ok: true; postulanteId: string } | { ok: false; error: string }> {
  const { data: postulante } = await supabase
    .from('perfil_postulante')
    .select('id')
    .eq('usuario_id', usuarioId)
    .single()

  if (!postulante) return { ok: false, error: 'Perfil no encontrado.' }

  const postulanteId = (postulante as { id: string }).id

  // Guard: must have a valid (non-stale) certificate to apply
  const { data: cert } = await supabase
    .from('certificado_pdf')
    .select('id, desactualizado')
    .eq('postulante_id', postulanteId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!cert) {
    return { ok: false, error: 'Necesitás generar tu certificado de perfil antes de postularte.' }
  }
  if ((cert as { desactualizado: boolean }).desactualizado) {
    return { ok: false, error: 'Tu certificado está desactualizado. Generá uno nuevo antes de postularte.' }
  }

  return { ok: true, postulanteId }
}

export async function postularAPuesto(puestoId: string): Promise<ActionResult> {
  const session = await verifySession()
  const supabase = await createClient()

  const guard = await verificarPostulanteConCertificado(supabase, session.id)
  if (!guard.ok) return { success: false, error: guard.error }

  // Guard: a puesto with a pre-screening form can only be applied to via
  // postularAPuestoConFormulario (the form cannot be bypassed).
  const formulario = await getFormularioDePuesto(puestoId)
  if (formulario) {
    return { success: false, error: 'Este puesto requiere completar el formulario de preselección para postularte.' }
  }

  // La postulación cuelga del ciclo vigente del puesto. Sin ciclo abierto el puesto
  // está cerrado y no admite postulaciones: la UI ya no lo ofrece, pero la action
  // es la que tiene que garantizarlo.
  const cicloId = await getCicloAbierto(puestoId)
  if (!cicloId) return { success: false, error: 'Este puesto ya no recibe postulaciones.' }

  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from('postulacion') as any).insert({
    postulante_id: guard.postulanteId,
    puesto_id: puestoId,
    historial_puesto_id: cicloId,
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

export async function postularAPuestoConFormulario(
  puestoId: string,
  _prevState: ActionResult<{ descartada: boolean }>,
  formData: FormData,
): Promise<ActionResult<{ descartada: boolean }>> {
  const session = await verifySession()
  const supabase = await createClient()

  const guard = await verificarPostulanteConCertificado(supabase, session.id)
  if (!guard.ok) return { success: false, error: guard.error }

  // The question set is always loaded server-side — never trusted from the client.
  const formulario = await getFormularioDePuesto(puestoId)
  if (!formulario || formulario.preguntas.length === 0) {
    return { success: false, error: 'Este puesto no tiene formulario de preselección.' }
  }

  // Every question must be answered; option answers must reference an option
  // belonging to that question.
  const respuestas: { preguntaId: string; opcionId: string | null; textoLibre: string | null }[] = []
  const fieldErrors: Record<string, string[]> = {}

  for (const pregunta of formulario.preguntas) {
    const raw = formData.get(`respuesta_${pregunta.id}`)
    const valor = typeof raw === 'string' ? raw.trim() : ''

    if (!valor) {
      fieldErrors[`respuesta_${pregunta.id}`] = ['Respondé esta pregunta.']
      continue
    }

    if (pregunta.tipo === TIPO_PREGUNTA_PRESELECTOR.OPCIONES) {
      const opcion = pregunta.opciones.find((o) => o.id === valor)
      if (!opcion) {
        fieldErrors[`respuesta_${pregunta.id}`] = ['Seleccioná una opción válida.']
        continue
      }
      respuestas.push({ preguntaId: pregunta.id, opcionId: opcion.id, textoLibre: null })
    } else {
      respuestas.push({ preguntaId: pregunta.id, opcionId: null, textoLibre: valor })
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, error: 'Respondé todas las preguntas del formulario.', fieldErrors }
  }

  const cicloId = await getCicloAbierto(puestoId)
  if (!cicloId) return { success: false, error: 'Este puesto ya no recibe postulaciones.' }

  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: postulacion, error } = await (admin.from('postulacion') as any)
    .insert({
      postulante_id: guard.postulanteId,
      puesto_id: puestoId,
      historial_puesto_id: cicloId,
      estado: 'ENVIADA',
    })
    .select('id')
    .single()

  if (error || !postulacion) {
    if (error?.code === '23505') return { success: false, error: 'Ya postulaste a este puesto.' }
    return { success: false, error: 'No se pudo registrar la postulación.' }
  }

  const postulacionId = (postulacion as { id: string }).id

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: respuestasError } = await (admin.from('respuesta_preselector') as any).insert(
    respuestas.map((r) => ({
      postulacion_id: postulacionId,
      pregunta_id: r.preguntaId,
      opcion_id: r.opcionId,
      texto_libre: r.textoLibre,
    }))
  )

  if (respuestasError) {
    // No transactions in supabase-js: best-effort cleanup of the orphan postulacion
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('postulacion') as any).delete().eq('id', postulacionId)
    return { success: false, error: 'No se pudieron guardar tus respuestas. Intentá de nuevo.' }
  }

  const evaluacion = evaluarRespuestasCriticas(
    formulario.preguntas.map((p) => ({
      id: p.id,
      texto: p.texto,
      esCritica: p.esCritica,
      opciones: p.opciones.map((o) => ({ id: o.id, esValida: o.esValida })),
    })),
    respuestas.map((r) => ({ preguntaId: r.preguntaId, opcionId: r.opcionId })),
  )

  let descartada = false
  if (!evaluacion.aprobado) {
    descartada = true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('postulacion') as any)
      .update({
        estado: 'PROCESO_FINALIZADO',
        motivo_descarte: construirMotivoDescarte(evaluacion.preguntasFalladas),
      })
      .eq('id', postulacionId)
  }

  revalidatePath('/postulante/puestos')
  revalidatePath('/postulante/postulaciones')
  return { success: true, data: { descartada } }
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

  // Actividad del reclutador sobre el puesto (evita el cierre automático).
  const { data: post } = await admin
    .from('postulacion')
    .select('puesto_id')
    .eq('id', postulacionId)
    .single()
  if (post) await marcarActividadPuesto((post as { puesto_id: string }).puesto_id)

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
