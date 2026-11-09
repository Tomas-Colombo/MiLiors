'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import type { ActionResult } from '@/lib/types/domain'
import {
  ESTADO_POSTULACION,
  ESTADO_POSTULACION_LABEL,
  TIPO_PREGUNTA_PRESELECTOR,
  type MarcaPostulacion,
} from '@/lib/constants/enums'
import { getFormularioDePuesto } from '@/modules/preselector/queries'
import { evaluarRespuestasCriticas, construirMotivoDescarte } from '@/modules/preselector/evaluador'
import { marcarActividadPuesto } from '@/modules/puestos/actividad'
import { getCicloAbierto } from '@/modules/puestos/ciclos'
import { getReclutadorId } from '@/modules/empresas/queries'
import {
  esOrigenValidoVisto,
  esOrigenValidoNoAvanzar,
  esOrigenValidoRevertirDescarte,
} from './transiciones'

/**
 * Interruptor de los avisos por mail de las postulaciones.
 *
 * Hoy está APAGADO a propósito. El único mail que MiLiors manda por ahora es el
 * de recuperación de cuenta, y ese lo emite Supabase Auth por su cuenta —no
 * pasa por acá.
 *
 * El código de abajo queda escrito y entero, en estado provisorio, porque la
 * decisión es "todavía no", no "nunca": cuando el remitente y las plantillas
 * estén definidos se prende con la variable de entorno y no hay que reescribir
 * nada. Mientras tanto el remitente que figura más abajo es ficticio.
 *
 * Apagado, la acción sigue su curso normal: cambiar el estado de una
 * postulación no depende del mail ni falla si no sale.
 */
const EMAIL_POSTULACIONES_HABILITADO = process.env.EMAIL_POSTULACIONES_HABILITADO === 'true'

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
        from: 'MiLiors <notificaciones@miliors.com>',
        to: emailDestino,
        subject: `Actualización en tu postulación — ${tituloPuesto}`,
        html: `
          <p>Hola ${nombrePostulante},</p>
          <p>Tu postulación al puesto <strong>${tituloPuesto}</strong> en <strong>${empresaNombre}</strong> fue actualizada.</p>
          <p><strong>Estado actual:</strong> ${estadoLabel}</p>
          <p>Ingresa a <a href="${process.env.NEXT_PUBLIC_APP_URL}/postulante/postulaciones">MiLiors</a> para ver el detalle.</p>
          <p>— El equipo de MiLiors</p>
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

  const { error } = await admin.from('postulacion').insert({
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

  const { data: postulacion, error } = await admin.from('postulacion')
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

  const { error: respuestasError } = await admin.from('respuesta_preselector').insert(
    respuestas.map((r) => ({
      postulacion_id: postulacionId,
      pregunta_id: r.preguntaId,
      opcion_id: r.opcionId,
      texto_libre: r.textoLibre,
    }))
  )

  if (respuestasError) {
    // No transactions in supabase-js: best-effort cleanup of the orphan postulacion
    await admin.from('postulacion').delete().eq('id', postulacionId)
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
    await admin.from('postulacion')
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

const ERROR_CICLO_CERRADO = 'Esta postulación pertenece a un ciclo del puesto que ya terminó.'
const ERROR_ESTADO_INVALIDO = 'El estado actual de la postulación no permite este cambio.'

function revalidarPostulacion(postulanteId: string) {
  revalidatePath('/reclutador/postulaciones')
  revalidatePath(`/reclutador/postulantes/${postulanteId}`)
}

type PostulacionPropia = {
  id: string
  estado: string
  puesto_id: string
  postulante_id: string
  reclutador_id: string
  titulo_puesto: string
  historial_puesto_id: string
  cicloAbierto: boolean
}

/**
 * La postulación, sólo si es de un puesto del reclutador actual; null si no
 * existe o es de otro. Las actions de abajo escriben con el service role (sin
 * RLS), así que la propiedad se prueba acá antes de tocar nada.
 */
async function getPostulacionPropia(postulacionId: string): Promise<PostulacionPropia | null> {
  const reclutadorId = await getReclutadorId()
  if (!reclutadorId) return null

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('postulacion')
    .select('id, estado, puesto_id, postulante_id, historial_puesto_id, puesto!inner(reclutador_id, titulo_puesto)')
    .eq('id', postulacionId)
    .eq('puesto.reclutador_id', reclutadorId)
    .maybeSingle()

  if (error || !data) {
    if (error) console.error('[postulaciones] Error al obtener postulacion:', error)
    return null
  }

  const row = data as {
    id: string
    estado: string
    puesto_id: string
    postulante_id: string
    historial_puesto_id: string
    puesto: { reclutador_id: string; titulo_puesto: string }
  }

  let cicloAbierto = false
  if (row.historial_puesto_id) {
    const { data: cicloData, error: cicloError } = await admin
      .from('historial_puesto')
      .select('fecha_fin')
      .eq('id', row.historial_puesto_id)
      .maybeSingle()

    if (cicloError || !cicloData) {
      console.error('[postulaciones] Error al consultar historial_puesto:', cicloError)
      cicloAbierto = false
    } else {
      cicloAbierto = (cicloData as { fecha_fin: string | null }).fecha_fin === null
    }
  } else {
    console.error('[postulaciones] Postulacion sin historial_puesto_id:', postulacionId)
    cicloAbierto = false
  }

  return {
    id: row.id,
    estado: row.estado,
    puesto_id: row.puesto_id,
    postulante_id: row.postulante_id,
    reclutador_id: row.puesto.reclutador_id,
    titulo_puesto: row.puesto.titulo_puesto,
    historial_puesto_id: row.historial_puesto_id,
    cicloAbierto,
  }
}

export async function avanzarEstadoPostulacion(
  postulacionId: string,
): Promise<ActionResult> {
  const postulacion = await getPostulacionPropia(postulacionId)
  if (!postulacion) return { success: false, error: 'No autorizado.' }

  if (!postulacion.cicloAbierto) {
    return { success: false, error: ERROR_CICLO_CERRADO }
  }

  if (postulacion.estado === ESTADO_POSTULACION.VISTO) {
    return { success: true, data: undefined }
  }

  if (!esOrigenValidoVisto(postulacion.estado)) {
    return { success: false, error: ERROR_ESTADO_INVALIDO }
  }

  const admin = createAdminClient()

  const { data: updated, error } = await admin
    .from('postulacion')
    .update({ estado: ESTADO_POSTULACION.VISTO })
    .eq('id', postulacionId)
    .eq('estado', ESTADO_POSTULACION.ENVIADA)
    .select('id')

  if (error) return { success: false, error: 'No se pudo actualizar el estado.' }

  if (!updated || updated.length === 0) {
    revalidarPostulacion(postulacion.postulante_id)
    return { success: false, error: ERROR_ESTADO_INVALIDO }
  }

  // Actividad del reclutador sobre el puesto (evita el cierre automático).
  await marcarActividadPuesto(postulacion.puesto_id)

  // Aviso por mail al postulante: apagado por ahora (ver
  // EMAIL_POSTULACIONES_HABILITADO). La guarda envuelve también a la consulta
  // de datos, que si no sería una ida a la base para no mandar nada.
  // Cuando esté prendido sigue sin bloquear: los errores se loguean adentro.
  if (EMAIL_POSTULACIONES_HABILITADO) {
    const datos = await getDatosEmail(postulacionId)
    if (datos?.email) {
      await enviarEmailCambioEstado(
        datos.email,
        datos.nombre,
        datos.titulo,
        datos.empresa,
        ESTADO_POSTULACION.VISTO,
      )
    }
  }

  revalidarPostulacion(postulacion.postulante_id)
  return { success: true, data: undefined }
}

export async function revertirDescarte(postulacionId: string): Promise<ActionResult> {
  const postulacion = await getPostulacionPropia(postulacionId)
  if (!postulacion) return { success: false, error: 'No autorizado.' }

  if (!postulacion.cicloAbierto) {
    return { success: false, error: ERROR_CICLO_CERRADO }
  }

  if (!esOrigenValidoRevertirDescarte(postulacion.estado)) {
    return { success: false, error: ERROR_ESTADO_INVALIDO }
  }

  const admin = createAdminClient()

  // Vuelve a "Evaluada" (VISTO) y limpia el motivo (si no, un descarte manual posterior
  // heredaría el motivo del descarte automático anterior).
  const { data: updated, error } = await admin
    .from('postulacion')
    .update({ estado: ESTADO_POSTULACION.VISTO, motivo_descarte: null })
    .eq('id', postulacionId)
    .eq('estado', ESTADO_POSTULACION.PROCESO_FINALIZADO)
    .select('id')

  if (error) return { success: false, error: 'No se pudo revertir el descarte.' }

  if (!updated || updated.length === 0) {
    revalidarPostulacion(postulacion.postulante_id)
    return { success: false, error: ERROR_ESTADO_INVALIDO }
  }

  // Actividad del reclutador sobre el puesto (evita el cierre automático).
  await marcarActividadPuesto(postulacion.puesto_id)

  revalidarPostulacion(postulacion.postulante_id)
  return { success: true, data: undefined }
}

export async function marcarPostulacion(
  postulacionId: string,
  marca: MarcaPostulacion | null,
): Promise<ActionResult> {
  const postulacion = await getPostulacionPropia(postulacionId)
  if (!postulacion) return { success: false, error: 'No autorizado.' }

  if (!postulacion.cicloAbierto) {
    return { success: false, error: ERROR_CICLO_CERRADO }
  }

  if (postulacion.estado === ESTADO_POSTULACION.CERRADA) {
    return { success: false, error: ERROR_ESTADO_INVALIDO }
  }

  // Elegir Avanzar o Duda sobre un candidato descartado cancela el descarte en
  // el mismo UPDATE: vuelve a VISTO y limpia el motivo, como revertirDescarte.
  const revierte =
    marca !== null && postulacion.estado === ESTADO_POSTULACION.PROCESO_FINALIZADO

  const admin = createAdminClient()

  const query = revierte
    ? admin
        .from('postulacion')
        .update({ estado: ESTADO_POSTULACION.VISTO, marca, motivo_descarte: null })
        .eq('id', postulacionId)
        .eq('estado', ESTADO_POSTULACION.PROCESO_FINALIZADO)
    : admin
        .from('postulacion')
        .update({ marca })
        .eq('id', postulacionId)
        .in('estado', [
          ESTADO_POSTULACION.ENVIADA,
          ESTADO_POSTULACION.VISTO,
          ESTADO_POSTULACION.PROCESO_FINALIZADO,
        ])

  const { data: updated, error } = await query.select('id')

  if (error) return { success: false, error: 'No se pudo actualizar la marca.' }

  if (!updated || updated.length === 0) {
    revalidarPostulacion(postulacion.postulante_id)
    return { success: false, error: ERROR_ESTADO_INVALIDO }
  }

  if (revierte) await marcarActividadPuesto(postulacion.puesto_id)

  revalidarPostulacion(postulacion.postulante_id)
  return { success: true, data: undefined }
}

/**
 * "No avanzar": cierra el proceso del candidato y limpia la marca en un solo
 * UPDATE. El motivo es opcional; si viene, queda como nota privada etiquetada
 * con el puesto. La nota se guarda después del cambio de estado para no dejar
 * el motivo de un descarte que no ocurrió.
 */
export async function noAvanzarPostulacion(
  postulacionId: string,
  motivo: string,
): Promise<ActionResult<{ notaGuardada: boolean }>> {
  const postulacion = await getPostulacionPropia(postulacionId)
  if (!postulacion) return { success: false, error: 'No autorizado.' }

  if (!postulacion.cicloAbierto) {
    return { success: false, error: ERROR_CICLO_CERRADO }
  }

  if (!esOrigenValidoNoAvanzar(postulacion.estado)) {
    return { success: false, error: ERROR_ESTADO_INVALIDO }
  }

  const texto = motivo.trim()

  const admin = createAdminClient()

  const { data: updated, error } = await admin
    .from('postulacion')
    .update({ estado: ESTADO_POSTULACION.PROCESO_FINALIZADO, marca: null })
    .eq('id', postulacionId)
    .in('estado', [ESTADO_POSTULACION.ENVIADA, ESTADO_POSTULACION.VISTO])
    .select('id')

  if (error) return { success: false, error: 'No se pudo actualizar el estado.' }

  if (!updated || updated.length === 0) {
    revalidarPostulacion(postulacion.postulante_id)
    return { success: false, error: ERROR_ESTADO_INVALIDO }
  }

  const guardarNota = texto
    ? admin
        .from('nota_privada')
        .insert({
          reclutador_id: postulacion.reclutador_id,
          postulante_id: postulacion.postulante_id,
          puesto_id: postulacion.puesto_id,
          contenido: `Motivo de no avanzar en "${postulacion.titulo_puesto}": ${texto}`,
        })
        .then(({ error: notaError }) => !notaError)
    : Promise.resolve(false)

  // Actividad del reclutador sobre el puesto (evita el cierre automático).
  const [notaGuardada] = await Promise.all([
    guardarNota,
    marcarActividadPuesto(postulacion.puesto_id),
  ])

  // Aviso por mail al postulante: apagado por ahora (ver EMAIL_POSTULACIONES_HABILITADO).
  if (EMAIL_POSTULACIONES_HABILITADO) {
    const datos = await getDatosEmail(postulacionId)
    if (datos?.email) {
      await enviarEmailCambioEstado(
        datos.email,
        datos.nombre,
        datos.titulo,
        datos.empresa,
        ESTADO_POSTULACION.PROCESO_FINALIZADO,
      )
    }
  }

  revalidarPostulacion(postulacion.postulante_id)
  return { success: true, data: { notaGuardada } }
}
