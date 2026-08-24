import 'server-only'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { clavesDescartadas, estaDescartada, type CertificadoSintesisJSON } from '@/lib/types/certificado'
import type { InformePersonalidadJSON } from '@/lib/types/informe'
import type { NivelCompetencia } from '@/lib/constants/enums'
import { destacadasDelInforme, nivelTecnicoACert, primerParrafo } from './niveles'
import type { CertificadoInput } from './generate-pdf'

/**
 * Arma el contenido del PDF del certificado a partir del perfil vigente.
 *
 * Lo usan la emisión (`crearCertificado`) y la descarga: el archivo guardado en
 * Storage es la copia de la emisión, pero al descargar se vuelve a renderizar
 * con esta misma función para que el diseño y los datos que ve el postulante
 * sean los actuales. Lo que queda fijo del certificado es su identidad —el ID de
 * verificación y la fecha de firma—, no el archivo.
 *
 * Usa el cliente admin: quien llama ya verificó sesión y propiedad.
 */
export type PropsCertificadoResult =
  | { success: true; props: CertificadoInput }
  | { success: false; error: string }

export async function construirPropsCertificado({
  postulanteId,
  certificadoId,
  timestampFirma,
}: {
  postulanteId: string
  certificadoId: string
  timestampFirma: string
}): Promise<PropsCertificadoResult> {
  const admin = createAdminClient()

  const { data: postulante } = await admin
    .from('perfil_postulante')
    .select(
      'id, nombre_completo, telefono, enlace_linkedin, carrera_otra, carrera:carrera_id(nombre), localidad(nombre, departamento(nombre, provincia(nombre))), usuario(email)'
    )
    .eq('id', postulanteId)
    .single()

  if (!postulante) return { success: false, error: 'Perfil no encontrado.' }
  const p = postulante as {
    id: string
    nombre_completo: string
    telefono: string | null
    enlace_linkedin: string | null
    carrera_otra: string | null
    carrera: { nombre: string } | null
    localidad: { nombre: string; departamento: { nombre: string; provincia: { nombre: string } | null } | null } | null
    usuario: { email: string } | null
  }

  const [{ data: informe }, { data: test }, { data: pt }] = await Promise.all([
    admin
      .from('informe_personalidad')
      .select('estado_informe, contenido_json')
      .eq('postulante_id', postulanteId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single(),
    admin
      .from('test_eneagrama')
      .select('test_eneagrama_dominante(puntaje_crudo, eneatipo(numero_eneatipo, nombre))')
      .eq('postulante_id', postulanteId)
      .single(),
    admin
      .from('perfil_tecnico')
      .select('id, sintesis_certificado, sintesis_estado')
      .eq('postulante_id', postulanteId)
      .single(),
  ])

  const informeTyped = informe as {
    estado_informe: string
    contenido_json: InformePersonalidadJSON | null
  } | null
  if (!informeTyped || informeTyped.estado_informe !== 'LISTO') {
    return { success: false, error: 'El informe de personalidad debe estar LISTO.' }
  }

  const testTyped = test as {
    test_eneagrama_dominante: { puntaje_crudo: number; eneatipo: { numero_eneatipo: number; nombre: string } }[]
  } | null
  const dominante = testTyped?.test_eneagrama_dominante?.[0]?.eneatipo
  if (!dominante) return { success: false, error: 'Eneatipo no calculado.' }

  const ptTyped = pt as {
    id: string
    sintesis_certificado: CertificadoSintesisJSON | null
    sintesis_estado: string
  } | null
  if (!ptTyped || ptTyped.sintesis_estado !== 'LISTO' || !ptTyped.sintesis_certificado) {
    return { success: false, error: 'Generá la síntesis del certificado (perfil integrado) antes de emitirlo.' }
  }
  const sintesis = ptTyped.sintesis_certificado

  // El objetivo es el que estaba vigente cuando se generó la síntesis. Fallback
  // a la carrera actual solo para síntesis previas a v3, que no lo guardaban.
  const objetivo = sintesis.objetivo ?? p.carrera?.nombre ?? p.carrera_otra ?? undefined

  const ptId = ptTyped.id
  // El orden se fija acá y no en la query embebida para que la previsualización
  // (`getCertificadoContenido`) y el PDF listen lo mismo.
  const [f, cu, e, i, c] = await Promise.all([
    admin
      .from('formacion_academica')
      .select('id, institucion, titulo, fecha_graduacion')
      .eq('perfil_tecnico_id', ptId)
      .order('fecha_graduacion', { ascending: false }),
    admin
      .from('curso')
      .select('id, nombre, institucion, fecha_fin, duracion_horas')
      .eq('perfil_tecnico_id', ptId)
      .order('fecha_fin', { ascending: false }),
    admin
      .from('experiencia_laboral')
      .select('id, empresa, puesto, fecha_inicio, fecha_fin, descripcion')
      .eq('perfil_tecnico_id', ptId)
      .order('fecha_inicio', { ascending: false }),
    admin.from('idioma').select('nombre, nivel_idioma').eq('perfil_tecnico_id', ptId).order('nombre'),
    admin.from('postulante_competencia').select('nivel, competencia(nombre)').eq('perfil_tecnico_id', ptId),
  ])

  const descartes = {
    formacion: clavesDescartadas(sintesis.descartados, 'formacion'),
    curso: clavesDescartadas(sintesis.descartados, 'curso'),
    experiencia: clavesDescartadas(sintesis.descartados, 'experiencia'),
    competencia: clavesDescartadas(sintesis.descartados, 'competencia'),
  }

  const formaciones = ((f.data ?? []) as { id: string; institucion: string; titulo: string; fecha_graduacion: string | null }[])
    .filter(item => !estaDescartada(descartes.formacion, item.id))
    .map(({ titulo, institucion, fecha_graduacion }) => ({ titulo, institucion, fecha_graduacion }))

  const cursos = ((cu.data ?? []) as { id: string; nombre: string; institucion: string; fecha_fin: string | null; duracion_horas: number | null }[])
    .filter(item => !estaDescartada(descartes.curso, item.id))
    .map(({ nombre, institucion, fecha_fin, duracion_horas }) => ({ nombre, institucion, fecha_fin, duracion_horas }))

  // El certificado muestra los últimos 3 puestos; el historial completo vive detrás del QR.
  const experiencias = ((e.data ?? []) as { id: string; empresa: string; puesto: string; fecha_inicio: string; fecha_fin: string | null; descripcion: string | null }[])
    .filter(item => !estaDescartada(descartes.experiencia, item.id))
    .slice(0, 3)
    .map(({ puesto, empresa, fecha_inicio, fecha_fin, descripcion }) => ({ puesto, empresa, fecha_inicio, fecha_fin, descripcion }))

  const idiomas = (i.data ?? []) as { nombre: string; nivel_idioma: string }[]

  const competencias = ((c.data ?? []) as { nivel: NivelCompetencia | null; competencia: { nombre: string } | null }[])
    .filter(row => row.competencia !== null && !estaDescartada(descartes.competencia, row.competencia.nombre))
    .map(row => ({ nombre: row.competencia!.nombre, nivel: nivelTecnicoACert(row.nivel ?? undefined) }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))

  if (formaciones.length === 0) {
    return { success: false, error: 'Necesitás al menos una formación académica para emitir el certificado.' }
  }
  if (competencias.length === 0) {
    return { success: false, error: 'Necesitás al menos una competencia para emitir el certificado.' }
  }

  return {
    success: true,
    props: {
      nombre: p.nombre_completo,
      email: p.usuario?.email ?? '',
      telefono: p.telefono,
      ubicacion: [p.localidad?.nombre, p.localidad?.departamento?.provincia?.nombre].filter(Boolean).join(', ') || null,
      linkedin: p.enlace_linkedin,
      objetivo,
      eneatipoNumero: dominante.numero_eneatipo,
      eneatipoNombre: dominante.nombre,
      // Resumen, no informe: el perfil completo es lo que se busca al escanear el QR.
      sintesis: primerParrafo(sintesis.perfilIntegrado ?? informeTyped.contenido_json?.descripcionPersonalidad),
      destacadas: destacadasDelInforme(informeTyped.contenido_json?.competencias),
      competencias,
      idiomas,
      experiencias,
      formaciones,
      cursos,
      timestampFirma,
      certificadoId,
    },
  }
}
