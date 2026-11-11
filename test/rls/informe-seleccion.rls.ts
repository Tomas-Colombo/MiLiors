import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import {
  PASSWORD,
  adminClient,
  anonClient,
  createAuthenticatedClient,
} from './helpers'

describe('Suite RLS — informe_seleccion_generado (H-221)', () => {
  const createdAuthUserIds: string[] = []
  const createdEmpresaIds: string[] = []
  const createdPuestoIds: string[] = []
  const createdInformeIds: string[] = []

  let userR1Id: string
  let userR2Id: string
  let reclutador1Id: string
  let reclutador2Id: string
  let empresa1Id: string
  let empresa2Id: string
  let puesto1Id: string
  let informe1Id: string

  let clientR1: SupabaseClient<Database>
  let clientR2: SupabaseClient<Database>

  beforeAll(async () => {
    const timestamp = Date.now()
    const emailR1 = `reclutador-inf-1-${timestamp}@example.test`
    const emailR2 = `reclutador-inf-2-${timestamp}@example.test`

    // 1. Crear usuarios en Auth
    const { data: authR1, error: errAuthR1 } = await adminClient.auth.admin.createUser({
      email: emailR1,
      password: PASSWORD,
      email_confirm: true,
    })
    if (errAuthR1 || !authR1.user) throw new Error(`authR1 error: ${errAuthR1?.message}`)
    userR1Id = authR1.user.id
    createdAuthUserIds.push(userR1Id)

    const { data: authR2, error: errAuthR2 } = await adminClient.auth.admin.createUser({
      email: emailR2,
      password: PASSWORD,
      email_confirm: true,
    })
    if (errAuthR2 || !authR2.user) throw new Error(`authR2 error: ${errAuthR2?.message}`)
    userR2Id = authR2.user.id
    createdAuthUserIds.push(userR2Id)

    // 2. Insertar en public.usuario
    const { error: errUsr } = await adminClient.from('usuario').insert([
      { id: userR1Id, email: emailR1, rol_usuario: 'RECLUTADOR' },
      { id: userR2Id, email: emailR2, rol_usuario: 'RECLUTADOR' },
    ])
    if (errUsr) throw new Error(`usuario error: ${errUsr.message}`)

    // 3. Crear empresas
    empresa1Id = crypto.randomUUID()
    empresa2Id = crypto.randomUUID()
    createdEmpresaIds.push(empresa1Id, empresa2Id)

    const { error: errEmp } = await adminClient.from('empresa').insert([
      { id: empresa1Id, nombre_empresa: `Empresa R1 ${timestamp}` },
      { id: empresa2Id, nombre_empresa: `Empresa R2 ${timestamp}` },
    ])
    if (errEmp) throw new Error(`empresa error: ${errEmp.message}`)

    // 4. Crear perfiles reclutador
    reclutador1Id = crypto.randomUUID()
    reclutador2Id = crypto.randomUUID()

    const { error: errPerfRec } = await adminClient.from('perfil_reclutador').insert([
      { id: reclutador1Id, usuario_id: userR1Id, nombre_reclutador: 'Reclutador 1', empresa_id: empresa1Id },
      { id: reclutador2Id, usuario_id: userR2Id, nombre_reclutador: 'Reclutador 2', empresa_id: empresa2Id },
    ])
    if (errPerfRec) throw new Error(`perfil_reclutador error: ${errPerfRec.message}`)

    // 5. Crear puesto para reclutador 1
    puesto1Id = crypto.randomUUID()
    createdPuestoIds.push(puesto1Id)

    const { error: errPuesto } = await adminClient.from('puesto').insert({
      id: puesto1Id,
      reclutador_id: reclutador1Id,
      empresa_id: empresa1Id,
      titulo_puesto: 'Senior Fullstack Engineer',
      carga_horaria: 'TIEMPO_COMPLETO',
      ubicacion: 'REMOTO',
    })
    if (errPuesto) throw new Error(`puesto error: ${errPuesto.message}`)

    // 6. Sembrar fila en informe_seleccion_generado con service_role
    informe1Id = crypto.randomUUID()
    createdInformeIds.push(informe1Id)

    const { error: errInforme } = await adminClient.from('informe_seleccion_generado').insert({
      id: informe1Id,
      reclutador_id: reclutador1Id,
      puesto_id: puesto1Id,
      cantidad_candidatos: 3,
      estado: 'LISTO',
      tokens_entrada: 1200,
      tokens_salida: 800,
    })
    if (errInforme) throw new Error(`informe_seleccion_generado error: ${errInforme.message}`)

    // 7. Clientes autenticados
    const { client: cR1 } = await createAuthenticatedClient(emailR1)
    const { client: cR2 } = await createAuthenticatedClient(emailR2)
    clientR1 = cR1
    clientR2 = cR2
  })

  afterAll(async () => {
    // Limpieza en orden estricto de dependencias FK
    // 1. Filas de informe_seleccion_generado
    if (createdInformeIds.length > 0) {
      await adminClient.from('informe_seleccion_generado').delete().in('id', createdInformeIds)
    }

    // 2. Puestos
    const puestos = createdPuestoIds.filter(Boolean)
    if (puestos.length > 0) {
      await adminClient.from('puesto').delete().in('id', puestos)
    }

    // 3. Usuarios en Auth (cascada a public.usuario -> perfil_reclutador)
    for (const userId of createdAuthUserIds) {
      await adminClient.auth.admin.deleteUser(userId)
    }

    // 4. Empresas
    if (createdEmpresaIds.length > 0) {
      await adminClient.from('empresa').delete().in('id', createdEmpresaIds)
    }
  })

  // ─── 1. Un reclutador lee sus propias filas sembradas con service role ────
  it('1. Un reclutador lee sus propias filas de informe_seleccion_generado', async () => {
    const { data, error } = await clientR1
      .from('informe_seleccion_generado')
      .select('*')
      .eq('id', informe1Id)

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data?.[0].id).toBe(informe1Id)
    expect(data?.[0].reclutador_id).toBe(reclutador1Id)
    expect(data?.[0].estado).toBe('LISTO')
  })

  // ─── 2. Otro reclutador no ve esas filas ───────────────────────────────────
  it('2. Otro reclutador NO ve las filas del primer reclutador', async () => {
    const { data, error } = await clientR2
      .from('informe_seleccion_generado')
      .select('*')
      .eq('id', informe1Id)

    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  // ─── 3. Un reclutador NO puede insertar ni actualizar con su propio cliente ─
  it('3. Un reclutador NO puede insertar filas con su propio cliente (bloqueado por permisos/RLS)', async () => {
    const { error } = await clientR1.from('informe_seleccion_generado').insert({
      reclutador_id: reclutador1Id,
      puesto_id: puesto1Id,
      cantidad_candidatos: 2,
      estado: 'GENERANDO',
    })

    expect(error).not.toBeNull()
    // Sin privilegios de INSERT (REVOKE ALL FROM anon, PUBLIC; GRANT SELECT TO authenticated)
    // Postgres devuelve código 42501 (insufficient_privilege)
    expect(error?.code).toBe('42501')
  })

  it('3b. Un reclutador NO puede actualizar filas con su propio cliente (bloqueado por permisos/RLS)', async () => {
    const { error } = await clientR1
      .from('informe_seleccion_generado')
      .update({ estado: 'ERROR' })
      .eq('id', informe1Id)

    expect(error).not.toBeNull()
    // Sin privilegios de UPDATE para authenticated, devuelve 42501
    expect(error?.code).toBe('42501')
  })

  // ─── 4. anon no lee nada ──────────────────────────────────────────────────
  it('4. anon no lee nada en informe_seleccion_generado', async () => {
    const { data, error } = await anonClient
      .from('informe_seleccion_generado')
      .select('*')
      .eq('id', informe1Id)

    // Con REVOKE ALL FROM anon, PUBLIC, el select devuelve error 42501 o lista vacía
    if (error) {
      expect(error.code).toBe('42501')
    } else {
      expect(data).toHaveLength(0)
    }
  })
})
