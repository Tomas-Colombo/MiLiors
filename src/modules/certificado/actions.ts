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
    .select('id, nombre_completo, especificidad_puesto')
    .eq('usuario_id', session.id)
    .single()

  if (!postulante) return { success: false, error: 'Perfil no encontrado.' }
  const postulanteTyped = postulante as { id: string; nombre_completo: string; especificidad_puesto: string | null }

  const { data: informe } = await supabase
    .from('informe_personalidad')
    .select('estado_informe')
    .eq('postulante_id', postulanteTyped.id)
    .single()

  if (!informe || (informe as { estado_informe: string }).estado_informe !== 'LISTO') {
    return {
      success: false,
      error: 'El informe de personalidad debe estar en estado LISTO para generar el certificado.',
    }
  }

  // 2. Get eneatipo
  const { data: test } = await supabase
    .from('test_eneagrama')
    .select('eneatipo(numero_eneatipo, nombre)')
    .eq('postulante_id', postulanteTyped.id)
    .single()

  if (!test) return { success: false, error: 'Test de Eneagrama no encontrado.' }
  const testTyped = test as { eneatipo: { numero_eneatipo: number; nombre: string } | null }
  if (!testTyped.eneatipo) return { success: false, error: 'Eneatipo no calculado.' }

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

  // 5. Generate certificate ID before PDF (QR needs it)
  const certificadoId = crypto.randomUUID()
  const timestampFirma = new Date().toISOString()

  // 6. Generate PDF with embedded QR
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generarPDFBuffer({
      nombre: postulanteTyped.nombre_completo,
      email: session.email,
      eneatipoNumero: testTyped.eneatipo.numero_eneatipo,
      eneatipoNombre: testTyped.eneatipo.nombre,
      humanDesign: hd
        ? (hd as { tipo_energetico: string; autoridad_hd: string; perfil_hd: string; estrategia_hd: string })
        : null,
      formaciones,
      experiencias,
      idiomas,
      competencias,
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

  // 8. Persist record in DB
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: dbError } = await (admin.from('certificado_pdf') as any).insert({
    id: certificadoId,
    postulante_id: postulanteTyped.id,
    url_archivo: storagePath,
    timestamp_firma: timestampFirma,
  })

  if (dbError) {
    console.error('[certificado] Error guardando en DB:', dbError.message)
    // Attempt to clean up the uploaded file
    await admin.storage.from('certificados').remove([storagePath])
    return { success: false, error: 'Error al registrar el certificado.' }
  }

  revalidatePath('/postulante/certificado')
  return { success: true, data: { certificadoId } }
}
