'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import { generarPDFBuffer } from './generate-pdf'
import { generarSintesisCertificado } from './sintesis-service'
import { construirPropsCertificado } from './pdf-props'
import type { ActionResult } from '@/lib/types/domain'
import type { InformePersonalidadJSON } from '@/lib/types/informe'
import type { CertificadoSintesisJSON } from '@/lib/types/certificado'

export async function crearCertificado(): Promise<ActionResult<{ certificadoId: string }>> {
  const session = await verifySession()
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: postulante } = await supabase
    .from('perfil_postulante')
    .select('id, nombre_completo')
    .eq('usuario_id', session.id)
    .single()

  if (!postulante) return { success: false, error: 'Perfil no encontrado.' }
  const postulanteTyped = postulante as { id: string; nombre_completo: string }

  // El informe desactualizado bloquea la EMISIÓN (no la descarga de uno ya emitido).
  const { data: informe } = await supabase
    .from('informe_personalidad')
    .select('estado_informe, desactualizado, contenido_json')
    .eq('postulante_id', postulanteTyped.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  const informeTyped = informe as {
    estado_informe: string
    desactualizado: boolean
    contenido_json: InformePersonalidadJSON | null
  } | null

  if (!informeTyped || informeTyped.estado_informe !== 'LISTO') {
    return {
      success: false,
      error: 'El informe de personalidad debe estar en estado LISTO para generar el certificado.',
    }
  }

  if (informeTyped.desactualizado) {
    return {
      success: false,
      error: 'El informe de personalidad está desactualizado. Regeneralo antes de emitir el certificado.',
    }
  }

  // El ID se genera antes del PDF porque el QR apunta a /verificar/{id}.
  const certificadoId = crypto.randomUUID()
  const timestampFirma = new Date().toISOString()

  const contenido = await construirPropsCertificado({
    postulanteId: postulanteTyped.id,
    certificadoId,
    timestampFirma,
  })
  if (!contenido.success) return { success: false, error: contenido.error }

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generarPDFBuffer(contenido.props)
  } catch (err) {
    console.error('[certificado] Error generando PDF:', err)
    return { success: false, error: 'No se pudo generar el PDF. Intentá de nuevo.' }
  }

  // 7. Upload to Supabase Storage
  const storagePath = `${postulanteTyped.id}/${certificadoId}.pdf`
  const { error: uploadError } = await admin.storage
    .from('certificados')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadError) {
    console.error('[certificado] Error subiendo a Storage:', uploadError.message)
    return { success: false, error: 'No se pudo almacenar el certificado.' }
  }

  // Persist record in DB (upsert by postulante_id — unique constraint in schema)
  const { error: dbError } = await admin.from('certificado_pdf').upsert({
    id: certificadoId,
    postulante_id: postulanteTyped.id,
    url_archivo: storagePath,
    timestamp_firma: timestampFirma,
    contenido_json: informeTyped.contenido_json ?? null,
    desactualizado: false,
  }, { onConflict: 'postulante_id' })

  if (dbError) {
    console.error('[certificado] Error guardando en DB:', dbError.message)
    // Attempt to clean up the uploaded file
    await admin.storage.from('certificados').remove([storagePath])
    return { success: false, error: 'Error al registrar el certificado.' }
  }

  revalidatePath('/postulante/certificado')
  return { success: true, data: { certificadoId } }
}

/**
 * Genera (o regenera) la síntesis integrada del certificado — el "perfil
 * profesional integrado" en 3ª persona que teje personalidad + trayectoria
 * técnica. Regeneración MANUAL (botón), espejo de `generarInforme`.
 *
 * Requiere un informe LISTO y no desactualizado. Si la generación falla, se
 * conserva la síntesis anterior (estado vuelve a LISTO si la había).
 */
export async function regenerarSintesisCertificado(): Promise<ActionResult> {
  const session = await verifySession()
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: postulante } = await supabase
    .from('perfil_postulante')
    .select('id, nombre_completo, carrera_otra, mostrar_personalidad_publico, carrera:carrera_id(nombre)')
    .eq('usuario_id', session.id)
    .single()

  if (!postulante) return { success: false, error: 'Perfil no encontrado.' }
  const postulanteTyped = postulante as {
    id: string
    nombre_completo: string
    carrera_otra: string | null
    mostrar_personalidad_publico: boolean | null
    carrera: { nombre: string } | null
  }

  // Informe LISTO y al día — de ahí sale la personalidad ya redactada.
  const { data: informe } = await supabase
    .from('informe_personalidad')
    .select('estado_informe, desactualizado, contenido_json')
    .eq('postulante_id', postulanteTyped.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  const informeTyped = informe as {
    estado_informe: string
    desactualizado: boolean
    contenido_json: InformePersonalidadJSON | null
  } | null

  if (!informeTyped || informeTyped.estado_informe !== 'LISTO' || !informeTyped.contenido_json) {
    return { success: false, error: 'El informe de personalidad debe estar LISTO para generar la síntesis.' }
  }
  if (informeTyped.desactualizado) {
    return { success: false, error: 'El informe está desactualizado. Regeneralo antes de la síntesis.' }
  }

  // "¿Qué estudiaste / qué buscás?" es el eje del certificado: sin esto no hay
  // contra qué medir la relevancia del resto del perfil técnico, así que nunca
  // puede estar vacío al generar la síntesis.
  const objetivo = postulanteTyped.carrera?.nombre ?? postulanteTyped.carrera_otra ?? null
  if (!objetivo) {
    return {
      success: false,
      error: 'Completá "¿Qué estudiaste / qué buscás?" en tu perfil antes de generar la síntesis.',
    }
  }

  // Perfil técnico + estado previo de la síntesis.
  const { data: pt } = await supabase
    .from('perfil_tecnico')
    .select('id, sintesis_certificado, sintesis_estado')
    .eq('postulante_id', postulanteTyped.id)
    .single()

  const ptTyped = pt as {
    id: string
    sintesis_certificado: CertificadoSintesisJSON | null
    sintesis_estado: string
  } | null

  if (!ptTyped) {
    return { success: false, error: 'Completá tu perfil técnico antes de generar la síntesis.' }
  }

  const teniaSintesisValida = ptTyped.sintesis_estado === 'LISTO' && ptTyped.sintesis_certificado != null

  // Material técnico a integrar — el perfil técnico completo, no solo un extracto.
  const [{ data: exp }, { data: comp }, { data: form }, { data: cur }, { data: idi }] = await Promise.all([
    supabase
      .from('experiencia_laboral')
      .select('id, puesto, empresa, fecha_inicio, fecha_fin, descripcion')
      .eq('perfil_tecnico_id', ptTyped.id)
      .order('fecha_inicio', { ascending: false }),
    supabase
      .from('postulante_competencia')
      .select('competencia(nombre)')
      .eq('perfil_tecnico_id', ptTyped.id),
    supabase
      .from('formacion_academica')
      .select('id, titulo, institucion, fecha_graduacion')
      .eq('perfil_tecnico_id', ptTyped.id)
      .order('fecha_graduacion', { ascending: false }),
    supabase
      .from('curso')
      .select('id, nombre, institucion, fecha_fin, duracion_horas')
      .eq('perfil_tecnico_id', ptTyped.id)
      .order('fecha_fin', { ascending: false }),
    supabase
      .from('idioma')
      .select('nombre, nivel_idioma')
      .eq('perfil_tecnico_id', ptTyped.id),
  ])

  const experiencias = (
    (exp ?? []) as {
      id: string
      puesto: string
      empresa: string
      fecha_inicio: string
      fecha_fin: string | null
      descripcion: string | null
    }[]
  ).map(e => ({
    id: e.id,
    puesto: e.puesto,
    empresa: e.empresa,
    fechaInicio: e.fecha_inicio,
    fechaFin: e.fecha_fin,
    descripcion: e.descripcion,
  }))

  const competenciasTecnicas = ((comp ?? []) as { competencia: { nombre: string } | null }[])
    .map(r => r.competencia?.nombre)
    .filter((n): n is string => !!n)

  const formaciones = (
    (form ?? []) as { id: string; titulo: string; institucion: string; fecha_graduacion: string | null }[]
  ).map(f => ({ id: f.id, titulo: f.titulo, institucion: f.institucion, fechaGraduacion: f.fecha_graduacion }))

  const cursos = (
    (cur ?? []) as { id: string; nombre: string; institucion: string; fecha_fin: string | null; duracion_horas: number | null }[]
  ).map(c => ({
    id: c.id,
    nombre: c.nombre,
    institucion: c.institucion,
    fechaFin: c.fecha_fin,
    duracionHoras: c.duracion_horas,
  }))

  const idiomas = ((idi ?? []) as { nombre: string; nivel_idioma: string }[]).map(i => ({
    nombre: i.nombre,
    nivel: i.nivel_idioma,
  }))

  if (competenciasTecnicas.length === 0) {
    return { success: false, error: 'Necesitás al menos una competencia técnica para generar la síntesis.' }
  }

  // Marcamos PENDIENTE sin borrar el contenido anterior. Si esta escritura falla,
  // cortamos acá: la llamada al LLM cuesta plata y no la vamos a poder guardar.
  const { error: marcarError } = await admin.from('perfil_tecnico')
    .update({ sintesis_estado: 'PENDIENTE' })
    .eq('id', ptTyped.id)

  if (marcarError) {
    console.error('[certificado/sintesis] No se pudo marcar PENDIENTE:', marcarError.message)
    return { success: false, error: 'No se pudo iniciar la generación. Intentá de nuevo.' }
  }

  async function fallar(motivo: string): Promise<ActionResult> {
    const { error: revertError } = await admin.from('perfil_tecnico')
      .update({ sintesis_estado: teniaSintesisValida ? 'LISTO' : 'ERROR' })
      .eq('id', ptTyped!.id)
    if (revertError) {
      console.error('[certificado/sintesis] No se pudo revertir el estado:', revertError.message)
    }
    revalidatePath('/postulante/certificado')
    return {
      success: false,
      error: teniaSintesisValida ? `${motivo} Se conservó tu síntesis anterior.` : motivo,
    }
  }

  const informeJson = informeTyped.contenido_json

  const resultado = await generarSintesisCertificado({
    nombre: postulanteTyped.nombre_completo,
    objetivo,
    subtitulo: informeJson.subtitulo ?? null,
    descripcionPersonalidad: informeJson.descripcionPersonalidad,
    talentos: (informeJson.talentosTop ?? []).map(t => ({ nombre: t.nombre, descripcion: t.descripcion })),
    // Solo las más marcadas: son anclas para tejer, no una lista a mostrar.
    competenciasDestacadas: (informeJson.competencias ?? [])
      .filter(c => c.nivel === 'Alto' || c.nivel === 'Medio-Alto')
      .map(c => ({ nombre: c.nombre, nivel: c.nivel })),
    comoTrabaja: (informeJson.comoTrabajas ?? []).map(i => ({ titulo: i.titulo, texto: i.texto })),
    competenciasTecnicas,
    formaciones,
    cursos,
    experiencias,
    idiomas,
    // Si el informe no es público, el QR no lo muestra: el certificado no puede
    // invitar a leerlo. Se lee acá y queda congelado en la síntesis, como todo
    // lo demás del documento firmado.
    personalidadPublica: postulanteTyped.mostrar_personalidad_publico === true,
  })

  if (!resultado.ok) {
    return fallar(`No se pudo generar la síntesis: ${resultado.motivo}`)
  }

  const { error: saveError } = await admin.from('perfil_tecnico')
    .update({ sintesis_certificado: resultado.sintesis, sintesis_estado: 'LISTO' })
    .eq('id', ptTyped.id)

  if (saveError) {
    console.error('[certificado/sintesis] Error al guardar:', saveError.message)
    return fallar('La síntesis se generó pero no se pudo guardar.')
  }

  // El PDF emitido lleva la síntesis adentro y vive congelado en Storage: al
  // cambiarla, el archivo descargable queda viejo aunque la previsualización
  // (que lee datos vivos) ya muestre la nueva. Marcarlo desactualizado es lo que
  // le ofrece al postulante re-emitirlo. Mismo patrón que eneagrama/human-design.
  const { error: marcarCertError } = await admin.from('certificado_pdf')
    .update({ desactualizado: true })
    .eq('postulante_id', postulanteTyped.id)

  if (marcarCertError) {
    // No es fatal: la síntesis ya se guardó bien. Pero sin esto el postulante se
    // descarga un PDF viejo creyendo que está al día, así que queda en el log.
    console.error(
      '[certificado/sintesis] No se pudo marcar el certificado como desactualizado:',
      marcarCertError.message,
    )
  }

  revalidatePath('/postulante/certificado')
  return { success: true, data: undefined }
}

/**
 * Actualiza el certificado de punta a punta: regenera la sintesis integrada
 * (unica llamada al LLM) y vuelve a emitir el PDF firmado con los datos vivos.
 *
 * Es el reemplazo de la regeneracion automatica por cambio de perfil: cada
 * edicion minima del perfil tecnico solo prende `certificado_pdf.desactualizado`
 * (ver `marcarCambioPerfilTecnico`), y el gasto del LLM ocurre una sola vez,
 * cuando el postulante aprieta el boton.
 */
export async function actualizarCertificado(): Promise<ActionResult> {
  const sintesis = await regenerarSintesisCertificado()
  if (!sintesis.success) return sintesis

  const certificado = await crearCertificado()
  if (!certificado.success) return { success: false, error: certificado.error }

  return { success: true, data: undefined }
}
