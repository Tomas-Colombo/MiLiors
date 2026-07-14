import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import { competenciasNoIntegradas } from './sintesis-service'
import type { CertificadoSintesisJSON, SintesisEstado } from '@/lib/types/certificado'

export type CertificadoData = {
  id: string
  postulante_id: string
  url_archivo: string | null
  timestamp_firma: string
  codigo_qr_url: string | null
  created_at: string
  desactualizado: boolean
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
    .select('id, postulante_id, url_archivo, timestamp_firma, codigo_qr_url, created_at, desactualizado')
    .eq('postulante_id', (postulante as { id: string }).id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return data ? (data as CertificadoData) : null
})

/**
 * Contenido a mostrar como previsualización del certificado — las mismas
 * secciones que el PDF (candidato, perfil de personalidad, formación,
 * experiencia, competencias, idiomas). Refleja los datos vigentes del perfil.
 */
export type CertificadoContenido = {
  nombre: string
  email: string
  eneatipoNumero: number
  eneatipoNombre: string
  humanDesign: {
    tipo_energetico: string
    autoridad_hd: string
    perfil_hd: string
    estrategia_hd: string
  } | null
  formaciones: { titulo: string; institucion: string; fecha_graduacion: string | null }[]
  experiencias: { puesto: string; empresa: string; fecha_inicio: string; fecha_fin: string | null }[]
  idiomas: { nombre: string; nivel_idioma: string }[]
  /** Competencias a mostrar como lista: todas si no hay síntesis, o solo las NO integradas si la hay. */
  competencias: { nombre: string }[]
  /** Párrafo del informe (fallback cuando aún no hay síntesis integrada). */
  personalidad?: string
  /** Perfil profesional integrado (síntesis). Cuando existe, reemplaza a `personalidad`. */
  perfilIntegrado?: string
  /** Estado de la síntesis integrada para dirigir la UI. */
  sintesisEstado: SintesisEstado
}

export const getCertificadoContenido = cache(async (): Promise<CertificadoContenido | null> => {
  const session = await verifySession()
  const supabase = await createClient()

  const { data: postulante } = await supabase
    .from('perfil_postulante')
    .select('id, nombre_completo')
    .eq('usuario_id', session.id)
    .single()

  if (!postulante) return null
  const postulanteTyped = postulante as { id: string; nombre_completo: string }

  // Eneatipo dominante (requerido para el perfil de personalidad)
  const { data: test } = await supabase
    .from('test_eneagrama')
    .select('test_eneagrama_dominante(puntaje_crudo, eneatipo(numero_eneatipo, nombre))')
    .eq('postulante_id', postulanteTyped.id)
    .single()

  const testTyped = test as {
    test_eneagrama_dominante: { puntaje_crudo: number; eneatipo: { numero_eneatipo: number; nombre: string } }[]
  } | null
  const dominante = testTyped?.test_eneagrama_dominante?.[0]?.eneatipo
  if (!dominante) return null

  // Human Design (opcional), informe (para la síntesis) y perfil técnico
  const [{ data: hd }, { data: informe }, { data: pt }] = await Promise.all([
    supabase
      .from('human_design')
      .select('tipo_energetico, autoridad_hd, perfil_hd, estrategia_hd')
      .eq('postulante_id', postulanteTyped.id)
      .single(),
    supabase
      .from('informe_personalidad')
      .select('contenido_json')
      .eq('postulante_id', postulanteTyped.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('perfil_tecnico')
      .select('id, sintesis_certificado, sintesis_estado')
      .eq('postulante_id', postulanteTyped.id)
      .single(),
  ])

  const ptTyped = pt as {
    id: string
    sintesis_certificado: CertificadoSintesisJSON | null
    sintesis_estado: SintesisEstado
  } | null

  let formaciones: CertificadoContenido['formaciones'] = []
  let experiencias: CertificadoContenido['experiencias'] = []
  let idiomas: CertificadoContenido['idiomas'] = []
  let competencias: CertificadoContenido['competencias'] = []

  if (ptTyped) {
    const ptId = ptTyped.id
    const [f, e, i, c] = await Promise.all([
      supabase.from('formacion_academica').select('titulo, institucion, fecha_graduacion').eq('perfil_tecnico_id', ptId),
      supabase.from('experiencia_laboral').select('puesto, empresa, fecha_inicio, fecha_fin').eq('perfil_tecnico_id', ptId),
      supabase.from('idioma').select('nombre, nivel_idioma').eq('perfil_tecnico_id', ptId),
      supabase.from('postulante_competencia').select('competencia(nombre)').eq('perfil_tecnico_id', ptId),
    ])
    formaciones = (f.data ?? []) as CertificadoContenido['formaciones']
    experiencias = (e.data ?? []) as CertificadoContenido['experiencias']
    idiomas = (i.data ?? []) as CertificadoContenido['idiomas']
    competencias = ((c.data ?? []) as { competencia: { nombre: string } | null }[])
      .map(row => row.competencia)
      .filter((x): x is { nombre: string } => x !== null)
  }

  const informeJson = (informe as { contenido_json: { descripcionPersonalidad?: string } | null } | null)?.contenido_json

  // Si hay síntesis integrada LISTA, mostramos el perfil integrado y dejamos en
  // la lista solo las competencias que NO se integraron (las integradas ya van
  // dentro de la prosa). Sin síntesis, fallback a la descripción del informe y
  // todas las competencias.
  const sintesis = ptTyped?.sintesis_estado === 'LISTO' ? ptTyped.sintesis_certificado : null
  const perfilIntegrado = sintesis?.perfilIntegrado
  const competenciasVisibles = sintesis
    ? competenciasNoIntegradas(competencias.map(c => c.nombre), sintesis.competenciasIntegradas).map(nombre => ({ nombre }))
    : competencias

  return {
    nombre: postulanteTyped.nombre_completo,
    email: session.email,
    eneatipoNumero: dominante.numero_eneatipo,
    eneatipoNombre: dominante.nombre,
    humanDesign: hd
      ? (hd as { tipo_energetico: string; autoridad_hd: string; perfil_hd: string; estrategia_hd: string })
      : null,
    formaciones,
    experiencias,
    idiomas,
    competencias: competenciasVisibles,
    personalidad: informeJson?.descripcionPersonalidad,
    perfilIntegrado,
    sintesisEstado: ptTyped?.sintesis_estado ?? 'PENDIENTE',
  }
})

/** Datos mínimos para verificación pública — NO requiere auth */
export type CertificadoVerificacion = {
  id: string
  timestamp_firma: string
  nombre_completo: string
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

  return {
    id: certTyped.id,
    timestamp_firma: certTyped.timestamp_firma,
    nombre_completo: postulanteTyped.nombre_completo,
  }
}
