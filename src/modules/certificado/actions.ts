'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import { generarPDFBuffer } from './generate-pdf'
import { generarSintesisCertificado, competenciasNoIntegradas } from './sintesis-service'
import type { ActionResult } from '@/lib/types/domain'
import type { InformePersonalidadJSON } from '@/lib/types/informe'
import type { CertificadoSintesisJSON } from '@/lib/types/certificado'
import type { FormacionItem, ExperienciaItem, IdiomaItem, CompetenciaItem } from '@/modules/perfil-tecnico/queries'

export async function crearCertificado(): Promise<ActionResult<{ certificadoId: string }>> {
  const session = await verifySession()
  const supabase = await createClient()
  const admin = createAdminClient()

  // 1. Verify informe is LISTO and get postulante data
  const { data: postulante } = await supabase
    .from('perfil_postulante')
    .select('id, nombre_completo, carrera_otra, carrera:carrera_id(nombre)')
    .eq('usuario_id', session.id)
    .single()

  if (!postulante) return { success: false, error: 'Perfil no encontrado.' }
  const postulanteTyped = postulante as {
    id: string
    nombre_completo: string
    carrera_otra: string | null
    carrera: { nombre: string } | null
  }

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

  // 2. Get eneatipo (primer dominante)
  const { data: test } = await supabase
    .from('test_eneagrama')
    .select('test_eneagrama_dominante(puntaje_crudo, eneatipo(numero_eneatipo, nombre))')
    .eq('postulante_id', postulanteTyped.id)
    .single()

  if (!test) return { success: false, error: 'Test de Eneagrama no encontrado.' }
  const testTyped = test as {
    test_eneagrama_dominante: { puntaje_crudo: number; eneatipo: { numero_eneatipo: number; nombre: string } }[]
  }
  if (testTyped.test_eneagrama_dominante.length === 0) return { success: false, error: 'Eneatipo no calculado.' }
  const primerDominante = testTyped.test_eneagrama_dominante[0].eneatipo

  // 3. Human Design (optional)
  const { data: hd } = await supabase
    .from('human_design')
    .select('tipo_energetico, autoridad_hd, perfil_hd, estrategia_hd')
    .eq('postulante_id', postulanteTyped.id)
    .single()

  // 4. Technical profile (incluye la síntesis integrada del certificado)
  const { data: pt } = await supabase
    .from('perfil_tecnico')
    .select('id, sintesis_certificado, sintesis_estado')
    .eq('postulante_id', postulanteTyped.id)
    .single()

  const ptSintesis = pt as {
    id: string
    sintesis_certificado: CertificadoSintesisJSON | null
    sintesis_estado: string
  } | null

  if (!ptSintesis || ptSintesis.sintesis_estado !== 'LISTO' || !ptSintesis.sintesis_certificado) {
    return {
      success: false,
      error: 'Generá la síntesis del certificado (perfil integrado) antes de emitirlo.',
    }
  }

  let formaciones: FormacionItem[] = []
  let experiencias: ExperienciaItem[] = []
  let idiomas: IdiomaItem[] = []
  let competencias: CompetenciaItem[] = []

  {
    const ptId = ptSintesis.id
    const [f, e, i, c] = await Promise.all([
      supabase
        .from('formacion_academica')
        .select('id, institucion, titulo, fecha_graduacion')
        .eq('perfil_tecnico_id', ptId),
      supabase
        .from('experiencia_laboral')
        .select('id, empresa, puesto, fecha_inicio, fecha_fin, descripcion')
        .eq('perfil_tecnico_id', ptId),
      supabase
        .from('idioma')
        .select('id, nombre, nivel_idioma')
        .eq('perfil_tecnico_id', ptId),
      supabase
        .from('postulante_competencia')
        .select('competencia_id, competencia(id, nombre)')
        .eq('perfil_tecnico_id', ptId),
    ])
    formaciones = (f.data ?? []) as FormacionItem[]
    experiencias = (e.data ?? []) as ExperienciaItem[]
    idiomas = (i.data ?? []) as IdiomaItem[]
    competencias = (c.data ?? [])
      .map((row: unknown) => {
        const r = row as { competencia: { id: string; nombre: string } | null }
        return r.competencia ?? null
      })
      .filter((x): x is CompetenciaItem => x !== null)
  }

  // 5. Guard: require at least 1 formación and 1 competencia
  if (formaciones.length === 0) {
    return { success: false, error: 'Necesitás al menos una formación académica para emitir el certificado.' }
  }
  if (competencias.length === 0) {
    return { success: false, error: 'Necesitás al menos una competencia para emitir el certificado.' }
  }

  // 6. Generate certificate ID before PDF (QR needs it)
  const certificadoId = crypto.randomUUID()
  const timestampFirma = new Date().toISOString()

  // Perfil integrado (síntesis del certificado) + competencias que NO se integraron
  const sintesis = ptSintesis.sintesis_certificado
  const noIntegradas = competenciasNoIntegradas(
    competencias.map(c => c.nombre),
    sintesis.competenciasIntegradas,
  ).map(nombre => ({ nombre }))

  // Generate PDF with embedded QR
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generarPDFBuffer({
      nombre: postulanteTyped.nombre_completo,
      email: session.email,
      eneatipoNumero: primerDominante.numero_eneatipo,
      eneatipoNombre: primerDominante.nombre,
      humanDesign: hd
        ? (hd as { tipo_energetico: string; autoridad_hd: string; perfil_hd: string; estrategia_hd: string })
        : null,
      formaciones,
      experiencias,
      idiomas,
      competencias: noIntegradas,
      perfilIntegrado: sintesis.perfilIntegrado,
      timestampFirma,
      certificadoId,
    })
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: dbError } = await (admin.from('certificado_pdf') as any).upsert({
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
    .select('id, nombre_completo, carrera_otra, carrera:carrera_id(nombre)')
    .eq('usuario_id', session.id)
    .single()

  if (!postulante) return { success: false, error: 'Perfil no encontrado.' }
  const postulanteTyped = postulante as {
    id: string
    nombre_completo: string
    carrera_otra: string | null
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

  // Material técnico a integrar.
  const [{ data: exp }, { data: comp }] = await Promise.all([
    supabase
      .from('experiencia_laboral')
      .select('puesto, empresa, descripcion')
      .eq('perfil_tecnico_id', ptTyped.id)
      .order('fecha_inicio', { ascending: false }),
    supabase
      .from('postulante_competencia')
      .select('competencia(nombre)')
      .eq('perfil_tecnico_id', ptTyped.id),
  ])

  const experiencias = ((exp ?? []) as { puesto: string; empresa: string; descripcion: string | null }[])
  const competenciasTecnicas = ((comp ?? []) as { competencia: { nombre: string } | null }[])
    .map(r => r.competencia?.nombre)
    .filter((n): n is string => !!n)

  if (competenciasTecnicas.length === 0) {
    return { success: false, error: 'Necesitás al menos una competencia técnica para generar la síntesis.' }
  }

  // Marcamos PENDIENTE sin borrar el contenido anterior.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from('perfil_tecnico') as any)
    .update({ sintesis_estado: 'PENDIENTE' })
    .eq('id', ptTyped.id)

  async function fallar(motivo: string): Promise<ActionResult> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('perfil_tecnico') as any)
      .update({ sintesis_estado: teniaSintesisValida ? 'LISTO' : 'ERROR' })
      .eq('id', ptTyped!.id)
    revalidatePath('/postulante/certificado')
    return {
      success: false,
      error: teniaSintesisValida ? `${motivo} Se conservó tu síntesis anterior.` : motivo,
    }
  }

  const resultado = await generarSintesisCertificado({
    nombre: postulanteTyped.nombre_completo,
    subtitulo: informeTyped.contenido_json.subtitulo ?? null,
    descripcionPersonalidad: informeTyped.contenido_json.descripcionPersonalidad,
    talentos: informeTyped.contenido_json.talentosTop.map(t => t.nombre),
    competenciasTecnicas,
    experiencias,
  })

  if (!resultado.ok) {
    return fallar(`No se pudo generar la síntesis: ${resultado.motivo}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: saveError } = await (admin.from('perfil_tecnico') as any)
    .update({ sintesis_certificado: resultado.sintesis, sintesis_estado: 'LISTO' })
    .eq('id', ptTyped.id)

  if (saveError) {
    console.error('[certificado/sintesis] Error al guardar:', saveError.message)
    return fallar('La síntesis se generó pero no se pudo guardar.')
  }

  revalidatePath('/postulante/certificado')
  return { success: true, data: undefined }
}
