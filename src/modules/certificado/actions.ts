'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import { generarPDFBuffer } from './generate-pdf'
import type { ActionResult } from '@/lib/types/domain'
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
    .select('estado_informe, desactualizado, contenido_informe')
    .eq('postulante_id', postulanteTyped.id)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (!informe || (informe as { estado_informe: string; desactualizado: boolean; contenido_informe: string | null }).estado_informe !== 'LISTO') {
    return {
      success: false,
      error: 'El informe de personalidad debe estar en estado LISTO para generar el certificado.',
    }
  }

  if ((informe as { estado_informe: string; desactualizado: boolean; contenido_informe: string | null }).desactualizado) {
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

  // 4. Technical profile
  const { data: pt } = await supabase
    .from('perfil_tecnico')
    .select('id')
    .eq('postulante_id', postulanteTyped.id)
    .single()

  let formaciones: FormacionItem[] = []
  let experiencias: ExperienciaItem[] = []
  let idiomas: IdiomaItem[] = []
  let competencias: CompetenciaItem[] = []

  if (pt) {
    const ptId = (pt as { id: string }).id
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

  // Snapshot personality text from informe (no second LLM call)
  const informeTyped = informe as { estado_informe: string; desactualizado: boolean; contenido_informe: string | null }
  let personalidadText: string | undefined
  if (informeTyped.contenido_informe) {
    try {
      const parsed = JSON.parse(informeTyped.contenido_informe) as { perfil_personalidad?: string }
      personalidadText = parsed.perfil_personalidad
    } catch {
      personalidadText = undefined
    }
  }

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
      competencias,
      personalidad: personalidadText,
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
    contenido_json: informeTyped.contenido_informe ?? null,
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
