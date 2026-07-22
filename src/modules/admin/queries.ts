import 'server-only'
import { createAdminClient } from '@/lib/supabase/server-admin'

// ─── Métricas del dashboard ──────────────────────────────────────────────────

export async function getMetricas() {
  const admin = createAdminClient()

  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [
    { count: totalPostulantes },
    { count: postulantesBusqueda },
    { count: informesListo },
    { count: informesPendiente },
    { count: informesError },
    { count: totalReclutadores },
    { count: totalEmpresas },
    { count: puestosActivos },
    { count: puestosCerrados },
    { count: consultasIAEsteMes },
  ] = await Promise.all([
    admin.from('perfil_postulante').select('*', { count: 'exact', head: true }),
    admin.from('perfil_postulante').select('*', { count: 'exact', head: true }).eq('perfil_en_busqueda', true),
    admin.from('informe_personalidad').select('*', { count: 'exact', head: true }).eq('estado_informe', 'LISTO'),
    admin.from('informe_personalidad').select('*', { count: 'exact', head: true }).eq('estado_informe', 'PENDIENTE'),
    admin.from('informe_personalidad').select('*', { count: 'exact', head: true }).eq('estado_informe', 'ERROR'),
    admin.from('perfil_reclutador').select('*', { count: 'exact', head: true }).is('fecha_baja', null),
    admin.from('empresa').select('*', { count: 'exact', head: true }).is('fecha_baja', null),
    admin.from('puesto').select('*', { count: 'exact', head: true }).eq('activo', true),
    admin.from('puesto').select('*', { count: 'exact', head: true }).eq('activo', false),
    admin.from('consulta_asistente_ia').select('*', { count: 'exact', head: true }).gte('fecha_consulta', inicioMes),
  ])

  return {
    totalPostulantes: totalPostulantes ?? 0,
    postulantesBusqueda: postulantesBusqueda ?? 0,
    informesListo: informesListo ?? 0,
    informesError: informesError ?? 0,
    informesPendiente: informesPendiente ?? 0,
    totalReclutadores: totalReclutadores ?? 0,
    totalEmpresas: totalEmpresas ?? 0,
    puestosActivos: puestosActivos ?? 0,
    puestosCerrados: puestosCerrados ?? 0,
    consultasIAEsteMes: consultasIAEsteMes ?? 0,
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

// ─── Ubicación: provincias y localidades ─────────────────────────────────────

export type ProvinciaAdmin = {
  id: string
  nombre: string
  codigo_indec: string | null
  fecha_baja: string | null
  created_at: string
}

export async function getProvinciasAdmin(): Promise<ProvinciaAdmin[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('provincia')
    .select('id, nombre, codigo_indec, fecha_baja, created_at')
    .order('nombre')
  return (data ?? []) as ProvinciaAdmin[]
}

export type LocalidadAdmin = {
  id: string
  nombre: string
  departamento: string | null
  fecha_baja: string | null
  created_at: string
}

export async function getLocalidadesAdmin(provinciaId: string): Promise<LocalidadAdmin[]> {
  if (!provinciaId) return []
  const admin = createAdminClient()
  const { data } = await admin
    .from('localidad')
    .select('id, nombre, departamento, fecha_baja, created_at')
    .eq('provincia_id', provinciaId)
    .order('nombre')
  return (data ?? []) as LocalidadAdmin[]
}

// ─── Carreras ────────────────────────────────────────────────────────────────

export type CarreraAdmin = {
  id: string
  nombre: string
  fecha_baja: string | null
  created_at: string
}

export async function getCarrerasAdmin(): Promise<CarreraAdmin[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('carrera')
    .select('id, nombre, fecha_baja, created_at')
    .order('nombre')
  return (data ?? []) as CarreraAdmin[]
}

export type CarreraOtraAdmin = {
  nombre: string
  cantidad: number
  primeraFecha: string
}

export async function getCarrerasOtrasAdmin(params?: {
  q?: string
  desde?: string
  hasta?: string
}): Promise<CarreraOtraAdmin[]> {
  const admin = createAdminClient()
  let query = admin
    .from('perfil_postulante')
    .select('carrera_otra, created_at')
    .not('carrera_otra', 'is', null)

  if (params?.q) query = query.ilike('carrera_otra', `%${params.q}%`)
  if (params?.desde) query = query.gte('created_at', params.desde)
  if (params?.hasta) query = query.lte('created_at', params.hasta)

  const { data } = await query
  const rows = (data ?? []) as { carrera_otra: string | null; created_at: string }[]

  const agregados = new Map<string, { cantidad: number; primeraFecha: string }>()
  for (const r of rows) {
    if (!r.carrera_otra) continue
    const nombre = r.carrera_otra
    const actual = agregados.get(nombre)
    if (!actual) {
      agregados.set(nombre, { cantidad: 1, primeraFecha: r.created_at })
    } else {
      actual.cantidad += 1
      if (r.created_at < actual.primeraFecha) actual.primeraFecha = r.created_at
    }
  }

  return Array.from(agregados.entries())
    .map(([nombre, { cantidad, primeraFecha }]) => ({ nombre, cantidad, primeraFecha }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
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

// ─── Idiomas ─────────────────────────────────────────────────────────────────

export async function getIdiomasAdmin() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('idioma_catalogo')
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
