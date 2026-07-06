import 'server-only'
import { createAdminClient } from '@/lib/supabase/server-admin'

// ─── Métricas del dashboard ──────────────────────────────────────────────────

export async function getMetricas() {
  const admin = createAdminClient()

  const [
    { count: totalPostulantes },
    { count: postulantesBusqueda },
    { data: informes },
    { count: totalReclutadores },
    { count: totalEmpresas },
    { count: puestosActivos },
    { count: puestosCerrados },
    { data: consultasIA },
  ] = await Promise.all([
    admin.from('perfil_postulante').select('*', { count: 'exact', head: true }),
    admin.from('perfil_postulante').select('*', { count: 'exact', head: true }).eq('perfil_en_busqueda', true),
    admin.from('informe_personalidad').select('estado_informe'),
    admin.from('perfil_reclutador').select('*', { count: 'exact', head: true }).is('fecha_baja', null),
    admin.from('empresa').select('*', { count: 'exact', head: true }).is('fecha_baja', null),
    admin.from('puesto').select('*', { count: 'exact', head: true }).eq('activo', true),
    admin.from('puesto').select('*', { count: 'exact', head: true }).eq('activo', false),
    admin.from('consulta_asistente_ia').select('fecha_consulta').gte(
      'fecha_consulta',
      new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    ),
  ])

  const informesArr = (informes ?? []) as { estado_informe: string }[]
  const informesListo = informesArr.filter(i => i.estado_informe === 'LISTO').length
  const informesError = informesArr.filter(i => i.estado_informe === 'ERROR').length
  const informesPendiente = informesArr.filter(i => i.estado_informe === 'PENDIENTE').length

  return {
    totalPostulantes: totalPostulantes ?? 0,
    postulantesBusqueda: postulantesBusqueda ?? 0,
    informesListo,
    informesError,
    informesPendiente,
    totalReclutadores: totalReclutadores ?? 0,
    totalEmpresas: totalEmpresas ?? 0,
    puestosActivos: puestosActivos ?? 0,
    puestosCerrados: puestosCerrados ?? 0,
    consultasIAEsteMes: (consultasIA ?? []).length,
  }
}

// ─── Sectores ────────────────────────────────────────────────────────────────

export async function getSectoresAdmin() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('sector_industrial')
    .select('id, nombre_sector, fecha_baja_s, created_at')
    .order('nombre_sector')
  return (data ?? []) as { id: string; nombre_sector: string; fecha_baja_s: string | null; created_at: string }[]
}

// ─── Competencias ────────────────────────────────────────────────────────────

export async function getCompetenciasAdmin() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('competencia')
    .select('id, nombre, fecha_baja, created_at')
    .order('nombre')
  return (data ?? []) as { id: string; nombre: string; fecha_baja: string | null; created_at: string }[]
}

// ─── Postulantes ─────────────────────────────────────────────────────────────

export async function getPostulantesAdmin() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('perfil_postulante')
    .select(`
      id, nombre_completo, perfil_en_busqueda, created_at,
      usuario(email),
      test_eneagrama(test_eneagrama_dominante(id)),
      informe_personalidad(estado_informe)
    `)
    .order('created_at', { ascending: false })

  return (data ?? []).map((row: unknown) => {
    const r = row as {
      id: string; nombre_completo: string; perfil_en_busqueda: boolean; created_at: string
      usuario: { email: string } | null
      test_eneagrama: { test_eneagrama_dominante: { id: string }[] } | null
      informe_personalidad: { estado_informe: string } | null
    }
    return {
      id: r.id,
      nombre_completo: r.nombre_completo,
      perfil_en_busqueda: r.perfil_en_busqueda,
      created_at: r.created_at,
      email: r.usuario?.email ?? null,
      eneagrama_completo: (r.test_eneagrama?.test_eneagrama_dominante.length ?? 0) > 0,
      estado_informe: r.informe_personalidad?.estado_informe ?? null,
    }
  })
}

// ─── Empresas y reclutadores ─────────────────────────────────────────────────

export async function getEmpresasAdmin() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('empresa')
    .select(`
      id, nombre_empresa, descripcion, fecha_baja, created_at,
      perfil_reclutador(id, nombre_reclutador, usuario(email))
    `)
    .order('created_at', { ascending: false })

  return (data ?? []).map((row: unknown) => {
    const r = row as {
      id: string; nombre_empresa: string; descripcion: string | null
      fecha_baja: string | null; created_at: string
      perfil_reclutador: { id: string; nombre_reclutador: string; usuario: { email: string } | null }[]
    }
    return {
      id: r.id,
      nombre_empresa: r.nombre_empresa,
      descripcion: r.descripcion,
      activa: !r.fecha_baja,
      created_at: r.created_at,
      reclutadores: r.perfil_reclutador.map(rec => ({
        id: rec.id,
        nombre: rec.nombre_reclutador,
        email: rec.usuario?.email ?? null,
      })),
    }
  })
}

// ─── Preguntas eneagrama ─────────────────────────────────────────────────────

export async function getPreguntasAdmin() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('pregunta_eneagrama')
    .select('id, numero_pregunta, enunciado, eneatipo_asociado, fecha_creacion, codigo_original, fecha_baja, pausada')
    .order('numero_pregunta')
  return (data ?? []) as {
    id: string
    numero_pregunta: number
    enunciado: string
    eneatipo_asociado: number
    fecha_creacion: string
    codigo_original: string | null
    fecha_baja: string | null
    pausada: boolean
  }[]
}

// ─── Términos y Condiciones ──────────────────────────────────────────────────

export async function getTyCVersiones() {
  const admin = createAdminClient()
  const [{ data: versiones }, { data: aceptaciones }] = await Promise.all([
    admin
      .from('terminos_y_condiciones')
      .select('id, version, descripcion, fecha_publicacion, fecha_baja_tyc')
      .order('fecha_publicacion', { ascending: false }),
    admin.from('aceptacion_tyc').select('tyc_id'),
  ])

  const conteo = new Map<string, number>()
  for (const a of (aceptaciones ?? []) as { tyc_id: string }[]) {
    conteo.set(a.tyc_id, (conteo.get(a.tyc_id) ?? 0) + 1)
  }

  return ((versiones ?? []) as {
    id: string
    version: string
    descripcion: string
    fecha_publicacion: string
    fecha_baja_tyc: string | null
  }[]).map(v => ({ ...v, aceptaciones: conteo.get(v.id) ?? 0 }))
}

// ─── Monitor de informes ─────────────────────────────────────────────────────

export async function getInformesAdmin() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('informe_personalidad')
    .select(`
      id, estado_informe, fecha_generacion, updated_at,
      perfil_postulante(nombre_completo, usuario(email))
    `)
    .order('updated_at', { ascending: false })

  return (data ?? []).map((row: unknown) => {
    const r = row as {
      id: string; estado_informe: string; fecha_generacion: string; updated_at: string
      perfil_postulante: { nombre_completo: string; usuario: { email: string } | null } | null
    }
    return {
      id: r.id,
      estado_informe: r.estado_informe,
      fecha_generacion: r.fecha_generacion,
      updated_at: r.updated_at,
      nombre_completo: r.perfil_postulante?.nombre_completo ?? '—',
      email: r.perfil_postulante?.usuario?.email ?? null,
    }
  })
}
