import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import {
  PASSWORD,
  apiUrl,
  anonKey,
  adminClient,
  anonClient,
  createAuthenticatedClient,
} from './helpers'

const createdAuthUserIds: string[] = []
const createdEmpresaIds: string[] = []

describe('Suite RLS P0 de Seguridad (PQ-02)', () => {
  let userAId: string
  let userBId: string
  let userCId: string
  let userR1Id: string
  let userR2Id: string

  let postulanteAId: string
  let postulanteBId: string
  let postulanteCId: string

  let ptAId: string
  let ptBId: string
  let ptCId: string

  let expAId: string
  let expBId: string
  let expCId: string

  let formCId: string
  let cursoCId: string
  let idiomaCId: string
  let compCId: string

  let reclutador1Id: string
  let reclutador2Id: string

  let empresa1Id: string
  let empresa2Id: string

  let puesto1Id: string
  let puesto2Id: string
  let historial1Id: string
  let historial2Id: string

  let clientA: SupabaseClient<Database>
  let _clientB: SupabaseClient<Database>
  let _clientC: SupabaseClient<Database>
  let clientR1: SupabaseClient<Database>
  let clientR2: SupabaseClient<Database>
  let tokenR1: string

  beforeAll(async () => {
    // 1. Crear usuarios en Auth
    const emailA = `postulante-a-${Date.now()}@example.test`
    const emailB = `postulante-b-${Date.now()}@example.test`
    const emailC = `postulante-c-${Date.now()}@example.test`
    const emailR1 = `reclutador-1-${Date.now()}@example.test`
    const emailR2 = `reclutador-2-${Date.now()}@example.test`

    const { data: authA, error: errA } = await adminClient.auth.admin.createUser({ email: emailA, password: PASSWORD, email_confirm: true })
    if (errA || !authA.user) throw new Error(`authA error: ${errA?.message}`)
    userAId = authA.user.id
    createdAuthUserIds.push(userAId)

    const { data: authB, error: errB } = await adminClient.auth.admin.createUser({ email: emailB, password: PASSWORD, email_confirm: true })
    if (errB || !authB.user) throw new Error(`authB error: ${errB?.message}`)
    userBId = authB.user.id
    createdAuthUserIds.push(userBId)

    const { data: authC, error: errC } = await adminClient.auth.admin.createUser({ email: emailC, password: PASSWORD, email_confirm: true })
    if (errC || !authC.user) throw new Error(`authC error: ${errC?.message}`)
    userCId = authC.user.id
    createdAuthUserIds.push(userCId)

    const { data: authR1, error: errR1 } = await adminClient.auth.admin.createUser({ email: emailR1, password: PASSWORD, email_confirm: true })
    if (errR1 || !authR1.user) throw new Error(`authR1 error: ${errR1?.message}`)
    userR1Id = authR1.user.id
    createdAuthUserIds.push(userR1Id)

    const { data: authR2, error: errR2 } = await adminClient.auth.admin.createUser({ email: emailR2, password: PASSWORD, email_confirm: true })
    if (errR2 || !authR2.user) throw new Error(`authR2 error: ${errR2?.message}`)
    userR2Id = authR2.user.id
    createdAuthUserIds.push(userR2Id)

    // 2. Insertar en public.usuario
    const { error: errUsr } = await adminClient.from('usuario').insert([
      { id: userAId, email: emailA, rol_usuario: 'POSTULANTE' },
      { id: userBId, email: emailB, rol_usuario: 'POSTULANTE' },
      { id: userCId, email: emailC, rol_usuario: 'POSTULANTE' },
      { id: userR1Id, email: emailR1, rol_usuario: 'RECLUTADOR' },
      { id: userR2Id, email: emailR2, rol_usuario: 'RECLUTADOR' },
    ])
    if (errUsr) throw new Error(`usuario error: ${errUsr.message}`)

    // 3. Insertar perfiles postulante (A y B visibles, C oculto)
    const { data: prov } = await adminClient.from('provincia').select('id').limit(1).single()
    if (!prov) throw new Error('No hay provincias en el catálogo')

    postulanteAId = crypto.randomUUID()
    postulanteBId = crypto.randomUUID()
    postulanteCId = crypto.randomUUID()

    const { error: errPerfPost } = await adminClient.from('perfil_postulante').insert([
      { id: postulanteAId, usuario_id: userAId, nombre_completo: 'Postulante A', perfil_en_busqueda: true, provincia_id: prov.id },
      { id: postulanteBId, usuario_id: userBId, nombre_completo: 'Postulante B', perfil_en_busqueda: true, provincia_id: prov.id },
      { id: postulanteCId, usuario_id: userCId, nombre_completo: 'Postulante C', perfil_en_busqueda: false, provincia_id: prov.id },
    ])
    if (errPerfPost) throw new Error(`perfil_postulante error: ${errPerfPost.message}`)

    // Requisitos de visibilidad H-230: A y B necesitan test con dominante e informe LISTO para ser visibles
    const { data: enea } = await adminClient.from('eneatipo').select('id').limit(1).single()
    if (!enea) throw new Error('No hay eneatipo en catálogo')
    for (const pId of [postulanteAId, postulanteBId]) {
      const tId = crypto.randomUUID()
      await adminClient.from('test_eneagrama').insert({ id: tId, postulante_id: pId })
      await adminClient.from('test_eneagrama_dominante').insert({
        id: crypto.randomUUID(),
        test_eneagrama_id: tId,
        eneatipo_id: enea.id,
        puntaje_crudo: 40,
        porcentaje: 80,
      })
      await adminClient.from('informe_personalidad').insert({
        id: crypto.randomUUID(),
        postulante_id: pId,
        estado_informe: 'LISTO',
      })
    }

    // 4. Insertar perfiles técnicos
    ptAId = crypto.randomUUID()
    ptBId = crypto.randomUUID()
    ptCId = crypto.randomUUID()

    const { error: errPT } = await adminClient.from('perfil_tecnico').insert([
      { id: ptAId, postulante_id: postulanteAId },
      { id: ptBId, postulante_id: postulanteBId },
      { id: ptCId, postulante_id: postulanteCId },
    ])
    if (errPT) throw new Error(`perfil_tecnico error: ${errPT.message}`)

    // 5. Insertar experiencia laboral
    expAId = crypto.randomUUID()
    expBId = crypto.randomUUID()
    expCId = crypto.randomUUID()

    const { error: errExp } = await adminClient.from('experiencia_laboral').insert([
      { id: expAId, perfil_tecnico_id: ptAId, empresa: 'Empresa A Corp', puesto: 'Dev A', fecha_inicio: '2023-01-01' },
      { id: expBId, perfil_tecnico_id: ptBId, empresa: 'Empresa B Corp', puesto: 'Dev B', fecha_inicio: '2023-01-01' },
      { id: expCId, perfil_tecnico_id: ptCId, empresa: 'Empresa C Corp', puesto: 'Dev C', fecha_inicio: '2023-01-01' },
    ])
    if (errExp) throw new Error(`experiencia_laboral error: ${errExp.message}`)

    // 6. Insertar formación, curso, idioma y competencia para C (para probar H-213)
    formCId = crypto.randomUUID()
    cursoCId = crypto.randomUUID()
    idiomaCId = crypto.randomUUID()
    compCId = crypto.randomUUID()

    const { error: errForm } = await adminClient.from('formacion_academica').insert({
      id: formCId,
      perfil_tecnico_id: ptCId,
      institucion: 'Universidad C',
      titulo: 'Licenciatura en Sistemas',
    })
    if (errForm) throw new Error(`formacion_academica error: ${errForm.message}`)

    const { error: errCurso } = await adminClient.from('curso').insert({
      id: cursoCId,
      perfil_tecnico_id: ptCId,
      nombre: 'Curso de Seguridad',
      institucion: 'Plataforma Online',
    })
    if (errCurso) throw new Error(`curso error: ${errCurso.message}`)

    const { error: errIdioma } = await adminClient.from('idioma').insert({
      id: idiomaCId,
      perfil_tecnico_id: ptCId,
      nombre: 'Inglés',
      nivel_idioma: 'AVANZADO',
    })
    if (errIdioma) throw new Error(`idioma error: ${errIdioma.message}`)

    const { data: compCatalog } = await adminClient.from('competencia').select('id').limit(1).single()
    if (!compCatalog) throw new Error('No hay competencias en el catálogo')

    const { error: errComp } = await adminClient.from('postulante_competencia').insert({
      id: compCId,
      perfil_tecnico_id: ptCId,
      competencia_id: compCatalog.id,
      nivel: 'AVANZADO',
    })
    if (errComp) throw new Error(`postulante_competencia error: ${errComp.message}`)

    // 7. Insertar perfiles de reclutadores y empresas
    empresa1Id = crypto.randomUUID()
    empresa2Id = crypto.randomUUID()
    createdEmpresaIds.push(empresa1Id, empresa2Id)

    const { error: errEmp } = await adminClient.from('empresa').insert([
      { id: empresa1Id, nombre_empresa: 'Empresa R1 SA' },
      { id: empresa2Id, nombre_empresa: 'Empresa R2 SA' },
    ])
    if (errEmp) throw new Error(`empresa error: ${errEmp.message}`)

    reclutador1Id = crypto.randomUUID()
    reclutador2Id = crypto.randomUUID()

    const { error: errPerfRec } = await adminClient.from('perfil_reclutador').insert([
      { id: reclutador1Id, usuario_id: userR1Id, nombre_reclutador: 'Reclutador 1', empresa_id: empresa1Id },
      { id: reclutador2Id, usuario_id: userR2Id, nombre_reclutador: 'Reclutador 2', empresa_id: empresa2Id },
    ])
    if (errPerfRec) throw new Error(`perfil_reclutador error: ${errPerfRec.message}`)

    const { error: errRecEmp } = await adminClient.from('reclutador_empresa').insert([
      { reclutador_id: reclutador1Id, empresa_id: empresa1Id },
      { reclutador_id: reclutador2Id, empresa_id: empresa2Id },
    ])
    if (errRecEmp) throw new Error(`reclutador_empresa error: ${errRecEmp.message}`)

    // 8. Insertar puestos para R1 y R2
    puesto1Id = crypto.randomUUID()
    puesto2Id = crypto.randomUUID()

    const { error: errPuesto } = await adminClient.from('puesto').insert([
      {
        id: puesto1Id,
        reclutador_id: reclutador1Id,
        empresa_id: empresa1Id,
        titulo_puesto: 'Senior Backend Engineer',
        carga_horaria: 'TIEMPO_COMPLETO',
        ubicacion: 'REMOTO',
      },
      {
        id: puesto2Id,
        reclutador_id: reclutador2Id,
        empresa_id: empresa2Id,
        titulo_puesto: 'Frontend Specialist',
        carga_horaria: 'TIEMPO_COMPLETO',
        ubicacion: 'REMOTO',
      },
    ])
    if (errPuesto) throw new Error(`puesto error: ${errPuesto.message}`)

    historial1Id = crypto.randomUUID()
    historial2Id = crypto.randomUUID()

    const { error: errHist } = await adminClient.from('historial_puesto').insert([
      { id: historial1Id, puesto_id: puesto1Id },
      { id: historial2Id, puesto_id: puesto2Id },
    ])
    if (errHist) throw new Error(`historial_puesto error: ${errHist.message}`)

    // 9. Postular al postulante C (oculto) ÚNICAMENTE al Puesto 1 (de Reclutador 1)
    const { error: errPostulacion } = await adminClient.from('postulacion').insert({
      postulante_id: postulanteCId,
      puesto_id: puesto1Id,
      historial_puesto_id: historial1Id,
      estado: 'ENVIADA',
    })
    if (errPostulacion) throw new Error(`postulacion error: ${errPostulacion.message}`)

    // 10. Conectar clientes autenticados
    const authClA = await createAuthenticatedClient(emailA)
    clientA = authClA.client

    const authClB = await createAuthenticatedClient(emailB)
    _clientB = authClB.client

    const authClC = await createAuthenticatedClient(emailC)
    _clientC = authClC.client

    const authClR1 = await createAuthenticatedClient(emailR1)
    clientR1 = authClR1.client
    tokenR1 = authClR1.session.access_token

    const authClR2 = await createAuthenticatedClient(emailR2)
    clientR2 = authClR2.client
  })

  // Orden impuesto por las FKs sin cascada: postulacion y puesto bloquean el
  // borrado del perfil_reclutador (y con él, del usuario), y perfil_reclutador
  // bloquea el de la empresa. Al revés, los borrados fallan y quedan datos de
  // prueba acumulados en la base local en cada corrida.
  afterAll(async () => {
    const puestos = [puesto1Id, puesto2Id].filter(Boolean)
    if (puestos.length > 0) {
      await adminClient.from('postulacion').delete().in('puesto_id', puestos)
      await adminClient.from('puesto').delete().in('id', puestos)
    }
    for (const userId of createdAuthUserIds) {
      await adminClient.auth.admin.deleteUser(userId)
    }
    if (createdEmpresaIds.length > 0) {
      await adminClient.from('empresa').delete().in('id', createdEmpresaIds)
    }
  })

  // ─── 1. H-200 ─────────────────────────────────────────────────────────────
  it('H-200: el postulante A no lee la experiencia del postulante B; un reclutador no lee la de un postulante oculto sin postulación', async () => {
    // Postulante A intenta leer experiencia laboral
    const { data: dataA, error: errA } = await clientA.from('experiencia_laboral').select('*')
    expect(errA).toBeNull()
    const expIdsA = (dataA ?? []).map((e) => e.id)
    expect(expIdsA).toContain(expAId)
    // No debe contener la experiencia de B (aunque B tenga perfil_en_busqueda = true)
    expect(expIdsA).not.toContain(expBId)
    expect(expIdsA).not.toContain(expCId)

    // Reclutador 2 (a cuyo puesto C no se postuló y C tiene perfil_en_busqueda = false)
    const { data: dataR2, error: errR2 } = await clientR2.from('experiencia_laboral').select('*')
    expect(errR2).toBeNull()
    const expIdsR2 = (dataR2 ?? []).map((e) => e.id)
    // R2 ve A y B porque están en búsqueda
    expect(expIdsR2).toContain(expAId)
    expect(expIdsR2).toContain(expBId)
    // R2 NO ve C porque C está oculto y no se postuló al puesto de R2
    expect(expIdsR2).not.toContain(expCId)
  })

  // ─── 2. H-201 ─────────────────────────────────────────────────────────────
  it('H-201: anon no puede insertar en usuario; usuario logueado sin fila no puede autoinsertarse con rol ADMIN', async () => {
    // 2a. Anon intenta insertar usuario
    const { error: errAnon } = await anonClient.from('usuario').insert({
      id: crypto.randomUUID(),
      email: 'exploit-anon@example.test',
      rol_usuario: 'ADMIN',
    })
    expect(errAnon).not.toBeNull()
    expect(errAnon?.code).toBe('42501')

    // 2b. Usuario de Auth creado sin fila en public.usuario intenta autoinsertarse como ADMIN
    const emailAttacker = `attacker-${Date.now()}@example.test`
    const { data: authAttacker } = await adminClient.auth.admin.createUser({
      email: emailAttacker,
      password: PASSWORD,
      email_confirm: true,
    })
    if (!authAttacker?.user) throw new Error('No se pudo crear usuario atacante')
    createdAuthUserIds.push(authAttacker.user.id)

    const attackerAuthClient = createClient(apiUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data: attackerSession, error: attackerLoginError } = await attackerAuthClient.auth.signInWithPassword({
      email: emailAttacker,
      password: PASSWORD,
    })
    if (attackerLoginError || !attackerSession.session) throw new Error('Error al loguear atacante')

    const attackerClient = createClient<Database>(apiUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: {
        headers: {
          Authorization: `Bearer ${attackerSession.session.access_token}`,
        },
      },
    })

    const { error: errAttacker } = await attackerClient.from('usuario').insert({
      id: authAttacker.user.id,
      email: emailAttacker,
      rol_usuario: 'ADMIN',
    })
    expect(errAttacker).not.toBeNull()
    expect(errAttacker?.code).toBe('42501')
  })

  // ─── 3. H-211 ─────────────────────────────────────────────────────────────
  it('H-211: el reclutador X no puede insertar en reclutador_empresa un vínculo con la empresa de Y', async () => {
    // Reclutador 1 intenta vincularse a la Empresa 2 de Reclutador 2
    const { error: errVinculo } = await clientR1.from('reclutador_empresa').insert({
      reclutador_id: reclutador1Id,
      empresa_id: empresa2Id,
    })
    expect(errVinculo).not.toBeNull()
    expect(errVinculo?.code).toBe('42501')
  })

  // ─── 4. H-213 ─────────────────────────────────────────────────────────────
  it('H-213: un reclutador SÍ lee perfil técnico de un postulante oculto postulado a su puesto, y NO si fue al de otro', async () => {
    // Reclutador 1 (titular del Puesto 1 al que C se postuló):
    const { data: formR1 } = await clientR1.from('formacion_academica').select('*').eq('id', formCId)
    expect(formR1?.length).toBe(1)

    const { data: cursoR1 } = await clientR1.from('curso').select('*').eq('id', cursoCId)
    expect(cursoR1?.length).toBe(1)

    const { data: idiomaR1 } = await clientR1.from('idioma').select('*').eq('id', idiomaCId)
    expect(idiomaR1?.length).toBe(1)

    const { data: compR1 } = await clientR1.from('postulante_competencia').select('*').eq('id', compCId)
    expect(compR1?.length).toBe(1)

    const { data: expR1 } = await clientR1.from('experiencia_laboral').select('*').eq('id', expCId)
    expect(expR1?.length).toBe(1)

    // Reclutador 2 (titular del Puesto 2 al que C NO se postuló y C está oculto):
    const { data: formR2 } = await clientR2.from('formacion_academica').select('*').eq('id', formCId)
    expect(formR2?.length).toBe(0)

    const { data: cursoR2 } = await clientR2.from('curso').select('*').eq('id', cursoCId)
    expect(cursoR2?.length).toBe(0)

    const { data: idiomaR2 } = await clientR2.from('idioma').select('*').eq('id', idiomaCId)
    expect(idiomaR2?.length).toBe(0)

    const { data: compR2 } = await clientR2.from('postulante_competencia').select('*').eq('id', compCId)
    expect(compR2?.length).toBe(0)

    const { data: expR2 } = await clientR2.from('experiencia_laboral').select('*').eq('id', expCId)
    expect(expR2?.length).toBe(0)
  })

  // ─── 5. H-008 ─────────────────────────────────────────────────────────────
  it('H-008: POST /rest/v1/rpc/reclutador_ve_postulante responde 404', async () => {
    const res = await fetch(`${apiUrl}/rest/v1/rpc/reclutador_ve_postulante`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${tokenR1}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_postulante_id: postulanteCId }),
    })
    expect(res.status).toBe(404)
  })

  // ─── 6. H-202 (pasos 1 a 3) ────────────────────────────────────────────────
  it('H-202 (pasos 1 a 3): aislamiento de puesto_criterio_psicologico (solo titular y ADMIN; columna eliminada de puesto)', async () => {
    // 6a. Anon y postulante no leen puesto_criterio_psicologico
    const { data: dataAnon } = await anonClient.from('puesto_criterio_psicologico').select('*')
    expect(dataAnon ?? []).toHaveLength(0)

    const { data: dataPostulante } = await clientA.from('puesto_criterio_psicologico').select('*')
    expect(dataPostulante ?? []).toHaveLength(0)

    // 6b. Reclutador titular (R1) lee y escribe la fila de su puesto (Puesto 1)
    const { error: errUpsertR1 } = await clientR1.from('puesto_criterio_psicologico').upsert({
      puesto_id: puesto1Id,
      perfil_psicologico_deseado: 'Criterio psicológico confidencial para puesto 1',
    })
    expect(errUpsertR1).toBeNull()

    const { data: dataR1, error: errSelectR1 } = await clientR1
      .from('puesto_criterio_psicologico')
      .select('*')
      .eq('puesto_id', puesto1Id)
    expect(errSelectR1).toBeNull()
    expect(dataR1?.[0]?.perfil_psicologico_deseado).toBe('Criterio psicológico confidencial para puesto 1')

    // 6c. Otro reclutador (R2) no puede leer ni modificar el criterio del Puesto 1
    const { data: dataR2 } = await clientR2
      .from('puesto_criterio_psicologico')
      .select('*')
      .eq('puesto_id', puesto1Id)
    expect(dataR2 ?? []).toHaveLength(0)

    const { data: updateR2 } = await clientR2
      .from('puesto_criterio_psicologico')
      .update({ perfil_psicologico_deseado: 'Intrusión no autorizada' })
      .eq('puesto_id', puesto1Id)
      .select()
    expect(updateR2 ?? []).toHaveLength(0)

    // 6d. Reclutador titular lee el criterio vía embed; otro reclutador recibe null en el embed
    type PuestoEmbedCriterio = {
      id: string
      puesto_criterio_psicologico: { perfil_psicologico_deseado: string | null } | null
    }

    const { data: puestoR1, error: errEmbedR1 } = await clientR1
      .from('puesto')
      .select('id, puesto_criterio_psicologico(perfil_psicologico_deseado)')
      .eq('id', puesto1Id)
      .single()
    expect(errEmbedR1).toBeNull()
    expect((puestoR1 as unknown as PuestoEmbedCriterio)?.puesto_criterio_psicologico?.perfil_psicologico_deseado).toBe(
      'Criterio psicológico confidencial para puesto 1'
    )

    const { data: puestoR2, error: errEmbedR2 } = await clientR2
      .from('puesto')
      .select('id, puesto_criterio_psicologico(perfil_psicologico_deseado)')
      .eq('id', puesto1Id)
      .single()
    expect(errEmbedR2).toBeNull()
    expect((puestoR2 as unknown as PuestoEmbedCriterio)?.puesto_criterio_psicologico).toBeNull()

    // 6e. La columna perfil_psicologico_deseado ya no existe en puesto (error 42703 para anon y postulante)
    const { error: errColAnon } = await anonClient
      .from('puesto')
      .select('perfil_psicologico_deseado' as unknown as 'id')
    expect(errColAnon?.code).toBe('42703')

    const { error: errColPostulante } = await clientA
      .from('puesto')
      .select('perfil_psicologico_deseado' as unknown as 'id')
    expect(errColPostulante?.code).toBe('42703')
  })
})
