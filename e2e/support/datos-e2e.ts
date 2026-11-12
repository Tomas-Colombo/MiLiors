import { randomBytes, randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../src/lib/types/database.types'
import { leerEntornoLocal } from './entorno-local'

/**
 * Datos fijos de la suite E2E, sembrados en el Supabase LOCAL antes de cada corrida.
 *
 * Cada test depende de un estado concreto (postulante con certificado vigente,
 * candidato visible para el reclutador, reclutador sin empresa para validar el
 * onboarding). Sembrarlo acá hace que ningún test quede en skip por falta de datos.
 */

type Admin = SupabaseClient<Database>

/** Cuentas fijas (dominio reservado `.test`) y las que crean los specs de registro. */
const EMAIL_E2E = /^e2e[.-][^@]*@(example\.test|mailinator\.com)$/

export const CUENTAS = {
  postulante: 'e2e.postulante@example.test',
  postulanteSinInforme: 'e2e.postulante.sin.informe@example.test',
  postulanteBloqueado: 'e2e.postulante.bloqueado@example.test',
  postulanteOculto: 'e2e.postulante.oculto@example.test',
  postulanteToggle: 'e2e.postulante.toggle@example.test',
  reclutador: 'e2e.reclutador@example.test',
  reclutador2: 'e2e.reclutador2@example.test',
  reclutadorSinEmpresa: 'e2e.reclutador.nuevo@example.test',
  admin: 'e2e.admin@example.test',
} as const

function clienteAdmin(): Admin {
  const { apiUrl, serviceRoleKey } = leerEntornoLocal()
  return createClient<Database>(apiUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Corta ante el primer error de Supabase; sin error, `data` es el resultado real. */
function must<T>(r: { data: T | null; error: { message: string } | null }, que: string): T {
  if (r.error) throw new Error(`Seed E2E — ${que}: ${r.error.message}`)
  return r.data as T
}

/** Igual que `must`, pero exige que la fila exista. */
function mustUno<R extends { data: unknown; error: { message: string } | null }>(
  r: R,
  que: string
): NonNullable<R['data']> {
  if (r.error) throw new Error(`Seed E2E — ${que}: ${r.error.message}`)
  if (r.data == null) throw new Error(`Seed E2E — ${que}: no hay filas`)
  return r.data as NonNullable<R['data']>
}

/** Contraseña aleatoria por corrida que cumple la política (mayúscula, minúscula, número). */
function generarPassword(): string {
  return `E2e-${randomBytes(12).toString('base64url')}9a`
}

async function usuariosE2E(admin: Admin) {
  const encontrados: { id: string; email: string }[] = []
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`Seed E2E — listUsers: ${error.message}`)
    for (const u of data.users) {
      if (u.email && EMAIL_E2E.test(u.email)) encontrados.push({ id: u.id, email: u.email })
    }
    if (data.users.length < 1000) return encontrados
  }
}

/**
 * Borra todo lo que dejaron corridas anteriores: cuentas fijas, cuentas creadas por
 * los specs de registro y lo que esas cuentas generaron (puestos, postulaciones,
 * notas, empresas). Hay FKs sin cascade, por eso el orden.
 */
export async function limpiarDatosE2E(admin: Admin = clienteAdmin()): Promise<void> {
  const usuarios = await usuariosE2E(admin)
  if (usuarios.length === 0) return
  const usuarioIds = usuarios.map((u) => u.id)

  const reclutadores = must(
    await admin.from('perfil_reclutador').select('id, empresa_id').in('usuario_id', usuarioIds),
    'perfiles de reclutador'
  )
  const postulantes = must(
    await admin.from('perfil_postulante').select('id').in('usuario_id', usuarioIds),
    'perfiles de postulante'
  )
  const reclutadorIds = reclutadores.map((r) => r.id)
  const postulanteIds = postulantes.map((p) => p.id)

  const vinculos = reclutadorIds.length
    ? must(await admin.from('reclutador_empresa').select('empresa_id').in('reclutador_id', reclutadorIds), 'vínculos')
    : []
  const empresaIds = [
    ...new Set([
      ...vinculos.map((v) => v.empresa_id),
      ...reclutadores.flatMap((r) => (r.empresa_id ? [r.empresa_id] : [])),
    ]),
  ]

  const puestoIds = reclutadorIds.length
    ? must(await admin.from('puesto').select('id').in('reclutador_id', reclutadorIds), 'puestos').map((p) => p.id)
    : []

  if (puestoIds.length) {
    const historial = must(
      await admin.from('historial_puesto').select('id').in('puesto_id', puestoIds),
      'historial de puestos'
    ).map((h) => h.id)
    if (historial.length) {
      must(await admin.from('contratacion').delete().in('historial_puesto_id', historial), 'contrataciones por puesto')
    }
    must(await admin.from('nota_privada').delete().in('puesto_id', puestoIds), 'notas por puesto')
    must(await admin.from('consulta_asistente_ia').delete().in('puesto_id', puestoIds), 'consultas por puesto')
    must(await admin.from('postulacion').delete().in('puesto_id', puestoIds), 'postulaciones por puesto')
    must(await admin.from('puesto').delete().in('id', puestoIds), 'puestos')
  }

  if (postulanteIds.length) {
    must(await admin.from('contratacion').delete().in('postulante_id', postulanteIds), 'contrataciones')
    must(await admin.from('nota_privada').delete().in('postulante_id', postulanteIds), 'notas')
    must(await admin.from('consulta_asistente_ia').delete().in('postulante_id', postulanteIds), 'consultas')
    must(await admin.from('postulacion').delete().in('postulante_id', postulanteIds), 'postulaciones por postulante')
  }

  // usuario y los perfiles caen en cascada desde auth.users.
  for (const id of usuarioIds) {
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error) throw new Error(`Seed E2E — deleteUser: ${error.message}`)
  }

  if (empresaIds.length) {
    must(await admin.from('empresa').delete().in('id', empresaIds), 'empresas')
  }
}

type CredencialesE2E = Record<keyof typeof CUENTAS, { email: string; password: string }>

export type SemillaE2E = {
  credenciales: CredencialesE2E
  postulanteIds: {
    postulante: string
    postulanteSinInforme: string
    postulanteBloqueado: string
    postulanteOculto: string
    postulanteToggle: string
  }
}

/** Limpia y vuelve a sembrar. Devuelve las credenciales e IDs de esta corrida. */
export async function sembrarDatosE2E(): Promise<SemillaE2E> {
  const admin = clienteAdmin()
  await limpiarDatosE2E(admin)

  const password = generarPassword()
  const crear = async (email: string, rol: Database['public']['Enums']['rol_usuario']) => {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (error || !data.user) throw new Error(`Seed E2E — alta de ${email}: ${error?.message}`)
    const { user } = data
    must(await admin.from('usuario').insert({ id: user.id, email, rol_usuario: rol }), `usuario ${email}`)
    return user.id
  }

  const userPostulante = await crear(CUENTAS.postulante, 'POSTULANTE')
  const userPostulanteSinInforme = await crear(CUENTAS.postulanteSinInforme, 'POSTULANTE')
  const userPostulanteBloqueado = await crear(CUENTAS.postulanteBloqueado, 'POSTULANTE')
  const userPostulanteOculto = await crear(CUENTAS.postulanteOculto, 'POSTULANTE')
  const userPostulanteToggle = await crear(CUENTAS.postulanteToggle, 'POSTULANTE')
  const userReclutador = await crear(CUENTAS.reclutador, 'RECLUTADOR')
  const userReclutador2 = await crear(CUENTAS.reclutador2, 'RECLUTADOR')
  const userReclutadorNuevo = await crear(CUENTAS.reclutadorSinEmpresa, 'RECLUTADOR')
  const userAdmin = await crear(CUENTAS.admin, 'ADMIN')

  // TyC vigente aceptada: sin esto el modal bloqueante tapa cada pantalla.
  const tycVigentes = must(
    await admin
      .from('terminos_y_condiciones')
      .select('id')
      .is('fecha_baja_tyc', null)
      .order('fecha_publicacion', { ascending: false })
      .limit(1),
    'TyC vigente'
  )
  const tyc = tycVigentes[0]
  if (tyc) {
    must(
      await admin.from('aceptacion_tyc').insert(
        [
          userPostulante,
          userPostulanteSinInforme,
          userPostulanteBloqueado,
          userPostulanteOculto,
          userPostulanteToggle,
          userReclutador,
          userReclutador2,
          userReclutadorNuevo,
          userAdmin,
        ].map((usuario_id) => ({
          usuario_id,
          tyc_id: tyc.id,
        }))
      ),
      'aceptación de TyC'
    )
  }

  const provincia = mustUno(await admin.from('provincia').select('id').limit(1).single(), 'provincia')
  const eneatipo = mustUno(await admin.from('eneatipo').select('id').limit(1).single(), 'eneatipo')

  const crearPostulante = async (opts: {
    usuarioId: string
    nombre: string
    enBusqueda: boolean
    bloqueado: boolean
    estadoInforme: Database['public']['Enums']['estado_informe']
    conCertificado?: boolean
  }): Promise<string> => {
    const id = randomUUID()
    must(
      await admin.from('perfil_postulante').insert({
        id,
        usuario_id: opts.usuarioId,
        nombre_completo: opts.nombre,
        provincia_id: provincia.id,
        perfil_en_busqueda: opts.enBusqueda,
        bloqueado_por_admin: opts.bloqueado,
      }),
      `perfil de ${opts.nombre}`
    )
    const test = mustUno(
      await admin.from('test_eneagrama').insert({ postulante_id: id, veces_completado: 1 }).select('id').single(),
      `test de ${opts.nombre}`
    )
    must(
      await admin.from('test_eneagrama_dominante').insert({
        test_eneagrama_id: test.id,
        eneatipo_id: eneatipo.id,
        puntaje_crudo: 30,
        porcentaje: 80,
      }),
      `dominante de ${opts.nombre}`
    )
    must(
      await admin.from('informe_personalidad').insert({
        postulante_id: id,
        estado_informe: opts.estadoInforme,
        contenido_informe: opts.estadoInforme === 'LISTO' ? `Informe E2E de ${opts.nombre}.` : null,
      }),
      `informe de ${opts.nombre}`
    )
    if (opts.conCertificado) {
      must(await admin.from('certificado_pdf').insert({ postulante_id: id }), `certificado de ${opts.nombre}`)
    }
    return id
  }

  // Postulante principal visible en búsquedas (H-230) y con certificado vigente.
  const postulanteId = await crearPostulante({
    usuarioId: userPostulante,
    nombre: 'Ana E2E Postulante',
    enBusqueda: true,
    bloqueado: false,
    estadoInforme: 'LISTO',
    conCertificado: true,
  })
  // Sin informe LISTO (PENDIENTE): no debe aparecer en búsquedas aunque tenga toggle ON.
  const postulanteSinInformeId = await crearPostulante({
    usuarioId: userPostulanteSinInforme,
    nombre: 'Bruno Sin Informe E2E',
    enBusqueda: true,
    bloqueado: false,
    estadoInforme: 'PENDIENTE',
  })
  // Bloqueado por admin: no debe aparecer en búsquedas aunque tenga toggle ON e informe LISTO.
  const postulanteBloqueadoId = await crearPostulante({
    usuarioId: userPostulanteBloqueado,
    nombre: 'Carla Bloqueada E2E',
    enBusqueda: true,
    bloqueado: true,
    estadoInforme: 'LISTO',
  })
  // Toggle OFF pero postuló a un puesto de Reclutador 1 (visible solo para él).
  const postulanteOcultoId = await crearPostulante({
    usuarioId: userPostulanteOculto,
    nombre: 'Diego Oculto E2E',
    enBusqueda: false,
    bloqueado: false,
    estadoInforme: 'LISTO',
    conCertificado: true,
  })
  // Postulante dedicado a pruebas de toggle ON/OFF para no interferir con Ana.
  const postulanteToggleId = await crearPostulante({
    usuarioId: userPostulanteToggle,
    nombre: 'Elena Toggle E2E',
    enBusqueda: true,
    bloqueado: false,
    estadoInforme: 'LISTO',
  })

  // Reclutador 1 con su empresa.
  const empresaId = randomUUID()
  must(await admin.from('empresa').insert({ id: empresaId, nombre_empresa: 'Empresa E2E' }), 'empresa')
  const reclutadorId = randomUUID()
  must(
    await admin.from('perfil_reclutador').insert({
      id: reclutadorId,
      usuario_id: userReclutador,
      nombre_reclutador: 'Reclutador E2E',
      empresa_id: empresaId,
    }),
    'perfil de reclutador'
  )
  must(
    await admin.from('reclutador_empresa').insert({ reclutador_id: reclutadorId, empresa_id: empresaId }),
    'vínculo reclutador-empresa'
  )

  // Puesto de Reclutador 1 con postulación de Diego Oculto (para TC-CAND-005 / TC-CAND-006).
  const puestoOcultoId = randomUUID()
  must(
    await admin.from('puesto').insert({
      id: puestoOcultoId,
      empresa_id: empresaId,
      reclutador_id: reclutadorId,
      titulo_puesto: 'Puesto E2E Visibilidad Base',
      carga_horaria: 'TIEMPO_COMPLETO',
      ubicacion: 'REMOTO',
      activo: true,
    }),
    'puesto visibilidad base'
  )
  const historialOculto = mustUno(
    await admin.from('historial_puesto').insert({ puesto_id: puestoOcultoId }).select('id').single(),
    'historial puesto visibilidad base'
  )
  must(
    await admin.from('postulacion').insert({
      puesto_id: puestoOcultoId,
      postulante_id: postulanteOcultoId,
      historial_puesto_id: historialOculto.id,
      estado: 'ENVIADA',
    }),
    'postulacion de postulante oculto'
  )

  // Reclutador 2 con su propia empresa (aislamiento entre empresas/reclutadores).
  const empresa2Id = randomUUID()
  must(await admin.from('empresa').insert({ id: empresa2Id, nombre_empresa: 'Empresa E2E 2' }), 'empresa 2')
  const reclutador2Id = randomUUID()
  must(
    await admin.from('perfil_reclutador').insert({
      id: reclutador2Id,
      usuario_id: userReclutador2,
      nombre_reclutador: 'Reclutador E2E 2',
      empresa_id: empresa2Id,
    }),
    'perfil de reclutador 2'
  )
  must(
    await admin.from('reclutador_empresa').insert({ reclutador_id: reclutador2Id, empresa_id: empresa2Id }),
    'vínculo reclutador2-empresa2'
  )

  return {
    credenciales: {
      postulante: { email: CUENTAS.postulante, password },
      postulanteSinInforme: { email: CUENTAS.postulanteSinInforme, password },
      postulanteBloqueado: { email: CUENTAS.postulanteBloqueado, password },
      postulanteOculto: { email: CUENTAS.postulanteOculto, password },
      postulanteToggle: { email: CUENTAS.postulanteToggle, password },
      reclutador: { email: CUENTAS.reclutador, password },
      reclutador2: { email: CUENTAS.reclutador2, password },
      reclutadorSinEmpresa: { email: CUENTAS.reclutadorSinEmpresa, password },
      admin: { email: CUENTAS.admin, password },
    },
    postulanteIds: {
      postulante: postulanteId,
      postulanteSinInforme: postulanteSinInformeId,
      postulanteBloqueado: postulanteBloqueadoId,
      postulanteOculto: postulanteOcultoId,
      postulanteToggle: postulanteToggleId,
    },
  }
}

/** Marca el email de una cuenta creada por un spec como confirmado (el registro real exige el mail). */
export async function confirmarEmail(email: string): Promise<void> {
  const admin = clienteAdmin()
  const usuario = (await usuariosE2E(admin)).find((u) => u.email === email)
  if (!usuario) throw new Error(`Seed E2E — no existe la cuenta ${email}`)
  const { error } = await admin.auth.admin.updateUserById(usuario.id, { email_confirm: true })
  if (error) throw new Error(`Seed E2E — confirmar ${email}: ${error.message}`)
}
