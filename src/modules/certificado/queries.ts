import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import { destacadasDelInforme, nivelTecnicoACert, primerParrafo, type CompetenciaDestacada, type NivelCert } from './niveles'
import {
  clavesDescartadas,
  estaDescartada,
  type CertificadoSintesisJSON,
  type SintesisDescarte,
  type SintesisEstado,
  type SintesisFortaleza,
} from '@/lib/types/certificado'
import type { InformePersonalidadJSON } from '@/lib/types/informe'
import type { NivelCompetencia } from '@/lib/constants/enums'

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
  telefono: string | null
  /** "Localidad, Provincia" — lo que haya cargado; null si no cargó ninguna. */
  ubicacion: string | null
  linkedin: string | null
  /** "¿Qué estudiaste / qué buscás?" vigente en el perfil — nunca vacío para poder previsualizar. */
  objetivo: string | null
  eneatipoNumero: number
  eneatipoNombre: string
  formaciones: { titulo: string; institucion: string; fecha_graduacion: string | null }[]
  cursos: { nombre: string; institucion: string; fecha_fin: string | null; duracion_horas: number | null }[]
  /** Últimos 3 puestos, del más reciente al más viejo. */
  experiencias: { puesto: string; empresa: string; fecha_inicio: string; fecha_fin: string | null; descripcion: string | null }[]
  idiomas: { nombre: string; nivel_idioma: string }[]
  /** Habilidades técnicas y herramientas del perfil, con el nivel que declaró el postulante. */
  competencias: { nombre: string; nivel: NivelCert }[]
  /** Competencias destacadas derivadas del informe (Eneagrama), agrupadas por nivel. */
  destacadas: CompetenciaDestacada[]
  /** Párrafo del informe (fallback cuando aún no hay síntesis integrada). */
  personalidad?: string
  /** Perfil profesional integrado (síntesis). Cuando existe, reemplaza a `personalidad`. */
  perfilIntegrado?: string
  /** Cruces personalidad × perfil técnico. Vacío en síntesis v1. */
  fortalezas?: SintesisFortaleza[]
  /** Entorno donde despliega su potencial. Ausente en síntesis v1. */
  contextoIdeal?: string
  /** Estado de la síntesis integrada para dirigir la UI. */
  sintesisEstado: SintesisEstado
  /** Ítems del perfil técnico que el triage dejó fuera del certificado, con motivo. */
  descartados?: SintesisDescarte[]
}

export const getCertificadoContenido = cache(async (): Promise<CertificadoContenido | null> => {
  const session = await verifySession()
  const supabase = await createClient()

  const { data: postulante } = await supabase
    .from('perfil_postulante')
    .select(
      'id, nombre_completo, telefono, enlace_linkedin, carrera_otra, carrera:carrera_id(nombre), provincia(nombre), localidad(nombre)'
    )
    .eq('usuario_id', session.id)
    .single()

  if (!postulante) return null
  const postulanteTyped = postulante as {
    id: string
    nombre_completo: string
    telefono: string | null
    enlace_linkedin: string | null
    carrera_otra: string | null
    carrera: { nombre: string } | null
    provincia: { nombre: string } | null
    localidad: { nombre: string } | null
  }
  const objetivo = postulanteTyped.carrera?.nombre ?? postulanteTyped.carrera_otra ?? null

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

  // Informe (para la síntesis) y perfil técnico
  const [{ data: informe }, { data: pt }] = await Promise.all([
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
  let cursos: CertificadoContenido['cursos'] = []
  let experiencias: CertificadoContenido['experiencias'] = []
  let idiomas: CertificadoContenido['idiomas'] = []
  let competencias: CertificadoContenido['competencias'] = []

  // Si hay síntesis integrada LISTA, el triage ya evaluó qué ítems no aportan a
  // la búsqueda declarada — se calcula antes para poder filtrarlos acá mismo.
  const sintesis = ptTyped?.sintesis_estado === 'LISTO' ? ptTyped.sintesis_certificado : null
  const formacionesDescartadas = clavesDescartadas(sintesis?.descartados, 'formacion')
  const cursosDescartados = clavesDescartadas(sintesis?.descartados, 'curso')
  const experienciasDescartadas = clavesDescartadas(sintesis?.descartados, 'experiencia')
  const competenciasDescartadas = clavesDescartadas(sintesis?.descartados, 'competencia')

  if (ptTyped) {
    const ptId = ptTyped.id
    const [f, cu, e, i, c] = await Promise.all([
      // El mismo orden que usa el PDF (`crearCertificado`): sin ORDER BY, Postgres
      // devuelve las filas en orden arbitrario y la previsualización puede no
      // coincidir con el archivo descargado.
      supabase
        .from('formacion_academica')
        .select('id, titulo, institucion, fecha_graduacion')
        .eq('perfil_tecnico_id', ptId)
        .order('fecha_graduacion', { ascending: false }),
      supabase
        .from('curso')
        .select('id, nombre, institucion, fecha_fin, duracion_horas')
        .eq('perfil_tecnico_id', ptId)
        .order('fecha_fin', { ascending: false }),
      supabase
        .from('experiencia_laboral')
        .select('id, puesto, empresa, fecha_inicio, fecha_fin, descripcion')
        .eq('perfil_tecnico_id', ptId)
        .order('fecha_inicio', { ascending: false }),
      supabase.from('idioma').select('nombre, nivel_idioma').eq('perfil_tecnico_id', ptId).order('nombre'),
      supabase.from('postulante_competencia').select('nivel, competencia(nombre)').eq('perfil_tecnico_id', ptId),
    ])
    formaciones = ((f.data ?? []) as { id: string; titulo: string; institucion: string; fecha_graduacion: string | null }[])
      .filter(item => !estaDescartada(formacionesDescartadas, item.id))
      .map(({ titulo, institucion, fecha_graduacion }) => ({ titulo, institucion, fecha_graduacion }))
    cursos = ((cu.data ?? []) as { id: string; nombre: string; institucion: string; fecha_fin: string | null; duracion_horas: number | null }[])
      .filter(item => !estaDescartada(cursosDescartados, item.id))
      .map(({ nombre, institucion, fecha_fin, duracion_horas }) => ({ nombre, institucion, fecha_fin, duracion_horas }))
    experiencias = ((e.data ?? []) as { id: string; puesto: string; empresa: string; fecha_inicio: string; fecha_fin: string | null; descripcion: string | null }[])
      .filter(item => !estaDescartada(experienciasDescartadas, item.id))
      .map(({ puesto, empresa, fecha_inicio, fecha_fin, descripcion }) => ({ puesto, empresa, fecha_inicio, fecha_fin, descripcion }))
      // El certificado muestra los últimos 3 puestos; el historial completo vive en el perfil.
      .slice(0, 3)
    idiomas = (i.data ?? []) as CertificadoContenido['idiomas']
    competencias = ((c.data ?? []) as { nivel: NivelCompetencia | null; competencia: { nombre: string } | null }[])
      .filter(row => row.competencia !== null && !estaDescartada(competenciasDescartadas, row.competencia.nombre))
      .map(row => ({ nombre: row.competencia!.nombre, nivel: nivelTecnicoACert(row.nivel ?? undefined) }))
      // Ordenar acá y no en la query: PostgREST no ordena el padre por una columna
      // del embed. Sin esto, previsualización y PDF pueden listarlas distinto.
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  }

  const informeJson = (informe as { contenido_json: InformePersonalidadJSON | null } | null)?.contenido_json

  // La síntesis del certificado es un resumen: un solo párrafo. El perfil
  // completo (fortalezas, contexto, informe) vive detrás del QR — que es
  // justamente el motivo por el que alguien lo escanea.
  const perfilIntegrado = primerParrafo(sintesis?.perfilIntegrado)

  return {
    nombre: postulanteTyped.nombre_completo,
    email: session.email,
    telefono: postulanteTyped.telefono,
    ubicacion:
      [postulanteTyped.localidad?.nombre, postulanteTyped.provincia?.nombre].filter(Boolean).join(', ') || null,
    linkedin: postulanteTyped.enlace_linkedin,
    objetivo,
    eneatipoNumero: dominante.numero_eneatipo,
    eneatipoNombre: dominante.nombre,
    formaciones,
    cursos,
    experiencias,
    idiomas,
    competencias,
    destacadas: destacadasDelInforme(informeJson?.competencias),
    personalidad: primerParrafo(informeJson?.descripcionPersonalidad),
    perfilIntegrado,
    fortalezas: sintesis?.fortalezas,
    contextoIdeal: sintesis?.contextoIdeal,
    sintesisEstado: ptTyped?.sintesis_estado ?? 'PENDIENTE',
    descartados: sintesis?.descartados,
  }
})

/**
 * Datos para la verificación pública — NO requiere auth.
 *
 * Además de confirmar el certificado, la página muestra el informe de
 * personalidad del titular: es lo que convierte una comprobación en una puerta
 * de entrada a MiLiors. Nunca incluye datos de contacto, para que la página no
 * sea una fuente de emails y teléfonos.
 */
export type CertificadoVerificacion = {
  id: string
  timestamp_firma: string
  nombre_completo: string
  /** Informe vigente del titular, o null si no lo tiene o eligió no mostrarlo. */
  informe: InformePersonalidadJSON | null
  fechaInforme: string | null
  /** true cuando el titular tiene informe pero apagó su visibilidad pública. */
  personalidadOculta: boolean
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

  // La preferencia de privacidad va en su propia consulta, no junto al nombre:
  // verificar un certificado no puede depender de ella. Si esa lectura falla
  // —por ejemplo, con la migración de `mostrar_personalidad_publico` todavía sin
  // aplicar— el certificado se verifica igual y el informe simplemente no se
  // muestra, que es el lado seguro para un dato personal.
  const [{ data: postulante }, { data: preferencia }, { data: informe }] = await Promise.all([
    admin.from('perfil_postulante').select('nombre_completo').eq('id', certTyped.postulante_id).single(),
    admin
      .from('perfil_postulante')
      .select('mostrar_personalidad_publico')
      .eq('id', certTyped.postulante_id)
      .single(),
    admin
      .from('informe_personalidad')
      .select('contenido_json, estado_informe, fecha_generacion')
      .eq('postulante_id', certTyped.postulante_id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single(),
  ])

  if (!postulante) return null
  const postulanteTyped = postulante as { nombre_completo: string }
  const mostrarPersonalidad = (preferencia as { mostrar_personalidad_publico: boolean } | null)
    ?.mostrar_personalidad_publico === true

  const informeTyped = informe as {
    contenido_json: InformePersonalidadJSON | null
    estado_informe: string
    fecha_generacion: string | null
  } | null

  const hayInforme = informeTyped?.estado_informe === 'LISTO' && !!informeTyped.contenido_json
  const visible = hayInforme && mostrarPersonalidad

  return {
    id: certTyped.id,
    timestamp_firma: certTyped.timestamp_firma,
    nombre_completo: postulanteTyped.nombre_completo,
    informe: visible ? informeTyped!.contenido_json : null,
    fechaInforme: visible ? informeTyped!.fecha_generacion : null,
    personalidadOculta: hayInforme && !mostrarPersonalidad,
  }
}
