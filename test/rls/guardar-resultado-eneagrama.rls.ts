import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import {
  PASSWORD,
  adminClient,
  anonClient,
  createAuthenticatedClient,
} from './helpers'

describe('Suite RLS / Transaccional — guardar_resultado_eneagrama (H-207)', () => {
  const createdAuthUserIds: string[] = []
  const createdPostulanteIds: string[] = []
  const createdTestIds: string[] = []

  let userP1Id: string
  let postulante1Id: string
  let testId: string
  let clientP1: SupabaseClient<Database>
  let eneatipo6Id: string

  beforeAll(async () => {
    // 1. Obtener ID de eneatipo 6 del catálogo
    const { data: eneatipo6, error: errEneatipo } = await adminClient
      .from('eneatipo')
      .select('id')
      .eq('numero_eneatipo', 6)
      .single()
    if (errEneatipo || !eneatipo6) throw new Error(`Error obteniendo eneatipo 6: ${errEneatipo?.message}`)
    eneatipo6Id = eneatipo6.id

    // 2. Crear usuario Auth
    const timestamp = Date.now()
    const emailP1 = `postulante-eneagrama-${timestamp}@example.test`

    const { data: authP1, error: errAuthP1 } = await adminClient.auth.admin.createUser({
      email: emailP1,
      password: PASSWORD,
      email_confirm: true,
    })
    if (errAuthP1 || !authP1.user) throw new Error(`authP1 error: ${errAuthP1?.message}`)
    userP1Id = authP1.user.id
    createdAuthUserIds.push(userP1Id)

    // 3. Crear usuario en public.usuario
    const { error: errUsr } = await adminClient.from('usuario').insert({
      id: userP1Id,
      email: emailP1,
      rol_usuario: 'POSTULANTE',
    })
    if (errUsr) throw new Error(`usuario error: ${errUsr.message}`)

    // 4. Perfil postulante
    const { data: prov, error: errProv } = await adminClient.from('provincia').select('id').limit(1).single()
    if (errProv || !prov) throw new Error('No hay provincias en el catálogo')

    postulante1Id = crypto.randomUUID()
    createdPostulanteIds.push(postulante1Id)

    const { error: errPerfPost } = await adminClient.from('perfil_postulante').insert({
      id: postulante1Id,
      usuario_id: userP1Id,
      nombre_completo: 'Postulante Eneagrama Test',
      perfil_en_busqueda: true,
      provincia_id: prov.id,
    })
    if (errPerfPost) throw new Error(`perfil_postulante error: ${errPerfPost.message}`)

    // 5. Test eneagrama inicial
    testId = crypto.randomUUID()
    createdTestIds.push(testId)

    const { error: errTest } = await adminClient.from('test_eneagrama').insert({
      id: testId,
      postulante_id: postulante1Id,
      veces_completado: 0,
    })
    if (errTest) throw new Error(`test_eneagrama error: ${errTest.message}`)

    // 6. Cliente autenticado
    const { client } = await createAuthenticatedClient(emailP1)
    clientP1 = client
  })

  afterAll(async () => {
    // Limpieza
    if (createdTestIds.length > 0) {
      await adminClient.from('test_eneagrama').delete().in('id', createdTestIds)
    }
    if (createdPostulanteIds.length > 0) {
      await adminClient.from('perfil_postulante').delete().in('id', createdPostulanteIds)
    }
    if (createdAuthUserIds.length > 0) {
      await adminClient.from('usuario').delete().in('id', createdAuthUserIds)
      for (const authId of createdAuthUserIds) {
        await adminClient.auth.admin.deleteUser(authId)
      }
    }
  })

  it('anon y authenticated no pueden ejecutar la función (error de permisos)', async () => {
    const payloadValido = {
      p_test_id: testId,
      p_ala: 5,
      p_tiene_empate_dominante: false,
      p_dominantes_empate: null,
      p_tiene_empate_ala: false,
      p_dominantes: [{ eneatipo_id: eneatipo6Id, puntaje_crudo: 53, porcentaje: 63.3 }],
      p_puntajes: [
        { eneatipo_numero: 1, puntaje_crudo: 50, porcentaje: 58.3 },
        { eneatipo_numero: 2, puntaje_crudo: 42, porcentaje: 45.0 },
        { eneatipo_numero: 3, puntaje_crudo: 50, porcentaje: 58.3 },
        { eneatipo_numero: 4, puntaje_crudo: 41, porcentaje: 43.3 },
        { eneatipo_numero: 5, puntaje_crudo: 49, porcentaje: 56.7 },
        { eneatipo_numero: 6, puntaje_crudo: 53, porcentaje: 63.3 },
        { eneatipo_numero: 7, puntaje_crudo: 48, porcentaje: 55.0 },
        { eneatipo_numero: 8, puntaje_crudo: 51, porcentaje: 60.0 },
        { eneatipo_numero: 9, puntaje_crudo: 49, porcentaje: 56.7 },
      ],
    }

    // Anon no tiene permisos de ejecución
    const { error: errAnon } = await anonClient.rpc('guardar_resultado_eneagrama', payloadValido)
    expect(errAnon).not.toBeNull()
    expect(errAnon?.message).toMatch(/permission denied|Could not find the function/i)

    // Authenticated no tiene permisos de ejecución
    const { error: errAuth } = await clientP1.rpc('guardar_resultado_eneagrama', payloadValido)
    expect(errAuth).not.toBeNull()
    expect(errAuth?.message).toMatch(/permission denied|Could not find the function/i)
  })

  it('con adminClient: un guardado válido deja 1 dominante, 9 puntajes y veces_completado incrementado', async () => {
    const payloadValido = {
      p_test_id: testId,
      p_ala: 5,
      p_tiene_empate_dominante: false,
      p_dominantes_empate: null,
      p_tiene_empate_ala: false,
      p_dominantes: [{ eneatipo_id: eneatipo6Id, puntaje_crudo: 53, porcentaje: 63.3 }],
      p_puntajes: [
        { eneatipo_numero: 1, puntaje_crudo: 50, porcentaje: 58.3 },
        { eneatipo_numero: 2, puntaje_crudo: 42, porcentaje: 45.0 },
        { eneatipo_numero: 3, puntaje_crudo: 50, porcentaje: 58.3 },
        { eneatipo_numero: 4, puntaje_crudo: 41, porcentaje: 43.3 },
        { eneatipo_numero: 5, puntaje_crudo: 49, porcentaje: 56.7 },
        { eneatipo_numero: 6, puntaje_crudo: 53, porcentaje: 63.3 },
        { eneatipo_numero: 7, puntaje_crudo: 48, porcentaje: 55.0 },
        { eneatipo_numero: 8, puntaje_crudo: 51, porcentaje: 60.0 },
        { eneatipo_numero: 9, puntaje_crudo: 49, porcentaje: 56.7 },
      ],
    }

    const { error } = await adminClient.rpc('guardar_resultado_eneagrama', payloadValido)
    expect(error).toBeNull()

    // 1. Verificar test_eneagrama
    const { data: testRow, error: errTest } = await adminClient
      .from('test_eneagrama')
      .select('ala, veces_completado, tiene_empate_dominante, tiene_empate_ala')
      .eq('id', testId)
      .single()
    expect(errTest).toBeNull()
    expect(testRow?.veces_completado).toBe(1)
    expect(testRow?.ala).toBe(5)

    // 2. Verificar test_eneagrama_dominante
    const { data: dominantes, error: errDom } = await adminClient
      .from('test_eneagrama_dominante')
      .select('eneatipo_id, puntaje_crudo, porcentaje')
      .eq('test_eneagrama_id', testId)
    expect(errDom).toBeNull()
    expect(dominantes).toHaveLength(1)
    expect(dominantes?.[0].eneatipo_id).toBe(eneatipo6Id)
    expect(dominantes?.[0].puntaje_crudo).toBe(53)
    expect(Number(dominantes?.[0].porcentaje)).toBe(63.3)

    // 3. Verificar resultado_puntaje_eneagrama
    const { data: puntajes, error: errPuntajes } = await adminClient
      .from('resultado_puntaje_eneagrama')
      .select('eneatipo_numero, puntaje_crudo, porcentaje')
      .eq('test_eneagrama_id', testId)
      .order('eneatipo_numero', { ascending: true })
    expect(errPuntajes).toBeNull()
    expect(puntajes).toHaveLength(9)
    expect(puntajes?.[5]).toMatchObject({
      eneatipo_numero: 6,
      puntaje_crudo: 53,
      porcentaje: 63.3,
    })
  })

  it('atomicidad: falla si se envía eneatipo_id inexistente (FK) y no altera nada', async () => {
    // Snapshot del estado previo
    const { data: testAntes } = await adminClient
      .from('test_eneagrama')
      .select('*')
      .eq('id', testId)
      .single()

    const { data: dominantesAntes } = await adminClient
      .from('test_eneagrama_dominante')
      .select('*')
      .eq('test_eneagrama_id', testId)

    const { data: puntajesAntes } = await adminClient
      .from('resultado_puntaje_eneagrama')
      .select('*')
      .eq('test_eneagrama_id', testId)
      .order('eneatipo_numero')

    // Llamada con eneatipo_id inexistente (viola foreign key)
    const eneatipoInexistente = crypto.randomUUID()
    const payloadInvalidoFK = {
      p_test_id: testId,
      p_ala: 7,
      p_tiene_empate_dominante: false,
      p_dominantes_empate: null,
      p_tiene_empate_ala: false,
      p_dominantes: [{ eneatipo_id: eneatipoInexistente, puntaje_crudo: 70, porcentaje: 90 }],
      p_puntajes: [
        { eneatipo_numero: 1, puntaje_crudo: 10, porcentaje: 15 },
        { eneatipo_numero: 2, puntaje_crudo: 10, porcentaje: 15 },
        { eneatipo_numero: 3, puntaje_crudo: 10, porcentaje: 15 },
        { eneatipo_numero: 4, puntaje_crudo: 10, porcentaje: 15 },
        { eneatipo_numero: 5, puntaje_crudo: 10, porcentaje: 15 },
        { eneatipo_numero: 6, puntaje_crudo: 10, porcentaje: 15 },
        { eneatipo_numero: 7, puntaje_crudo: 10, porcentaje: 15 },
        { eneatipo_numero: 8, puntaje_crudo: 10, porcentaje: 15 },
        { eneatipo_numero: 9, puntaje_crudo: 10, porcentaje: 15 },
      ],
    }

    const { error: errFk } = await adminClient.rpc('guardar_resultado_eneagrama', payloadInvalidoFK)
    expect(errFk).not.toBeNull()

    // Comprobar que NADA cambió
    const { data: testDespues } = await adminClient
      .from('test_eneagrama')
      .select('*')
      .eq('id', testId)
      .single()
    expect(testDespues?.veces_completado).toBe(testAntes?.veces_completado)
    expect(testDespues?.ala).toBe(testAntes?.ala)

    const { data: dominantesDespues } = await adminClient
      .from('test_eneagrama_dominante')
      .select('*')
      .eq('test_eneagrama_id', testId)
    expect(dominantesDespues).toEqual(dominantesAntes)

    const { data: puntajesDespues } = await adminClient
      .from('resultado_puntaje_eneagrama')
      .select('*')
      .eq('test_eneagrama_id', testId)
      .order('eneatipo_numero')
    expect(puntajesDespues).toEqual(puntajesAntes)
  })

  it('atomicidad: falla si se envían 8 puntajes y no altera nada', async () => {
    // Snapshot del estado previo
    const { data: testAntes } = await adminClient
      .from('test_eneagrama')
      .select('*')
      .eq('id', testId)
      .single()

    const { data: dominantesAntes } = await adminClient
      .from('test_eneagrama_dominante')
      .select('*')
      .eq('test_eneagrama_id', testId)

    const { data: puntajesAntes } = await adminClient
      .from('resultado_puntaje_eneagrama')
      .select('*')
      .eq('test_eneagrama_id', testId)
      .order('eneatipo_numero')

    // Llamada con solo 8 puntajes (viola validación de p_puntajes)
    const payloadInvalido8 = {
      p_test_id: testId,
      p_ala: 7,
      p_tiene_empate_dominante: false,
      p_dominantes_empate: null,
      p_tiene_empate_ala: false,
      p_dominantes: [{ eneatipo_id: eneatipo6Id, puntaje_crudo: 70, porcentaje: 90 }],
      p_puntajes: [
        { eneatipo_numero: 1, puntaje_crudo: 10, porcentaje: 15 },
        { eneatipo_numero: 2, puntaje_crudo: 10, porcentaje: 15 },
        { eneatipo_numero: 3, puntaje_crudo: 10, porcentaje: 15 },
        { eneatipo_numero: 4, puntaje_crudo: 10, porcentaje: 15 },
        { eneatipo_numero: 5, puntaje_crudo: 10, porcentaje: 15 },
        { eneatipo_numero: 6, puntaje_crudo: 10, porcentaje: 15 },
        { eneatipo_numero: 7, puntaje_crudo: 10, porcentaje: 15 },
        { eneatipo_numero: 8, puntaje_crudo: 10, porcentaje: 15 },
      ],
    }

    const { error: err8 } = await adminClient.rpc('guardar_resultado_eneagrama', payloadInvalido8)
    expect(err8).not.toBeNull()
    expect(err8?.message).toMatch(/p_puntajes debe ser un array JSON con exactamente 9 elementos/i)

    // Comprobar que NADA cambió
    const { data: testDespues } = await adminClient
      .from('test_eneagrama')
      .select('*')
      .eq('id', testId)
      .single()
    expect(testDespues?.veces_completado).toBe(testAntes?.veces_completado)
    expect(testDespues?.ala).toBe(testAntes?.ala)

    const { data: dominantesDespues } = await adminClient
      .from('test_eneagrama_dominante')
      .select('*')
      .eq('test_eneagrama_id', testId)
    expect(dominantesDespues).toEqual(dominantesAntes)

    const { data: puntajesDespues } = await adminClient
      .from('resultado_puntaje_eneagrama')
      .select('*')
      .eq('test_eneagrama_id', testId)
      .order('eneatipo_numero')
    expect(puntajesDespues).toEqual(puntajesAntes)
  })
})
