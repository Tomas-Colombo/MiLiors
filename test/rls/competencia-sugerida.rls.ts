import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import {
  PASSWORD,
  adminClient,
  anonClient,
  createAuthenticatedClient,
} from './helpers'

describe('Suite RLS — competencia_sugerida (H-205)', () => {
  const createdAuthUserIds: string[] = []
  const createdEmpresaIds: string[] = []
  const createdPuestoIds: string[] = []
  const createdHistorialIds: string[] = []
  const createdPostulacionIds: string[] = []
  const createdPerfilTecnicoIds: string[] = []
  const createdSugerenciaIds: string[] = []
  const createdCompetenciaCatalogoIds: string[] = []

  let userP1Id: string
  let userP2Id: string
  let userR1Id: string

  let postulante1Id: string
  let postulante2Id: string
  let pt1Id: string
  let pt2Id: string

  let empresaId: string
  let reclutadorId: string
  let puestoId: string
  let historialPuestoId: string
  let postulacionId: string

  let clientP1: SupabaseClient<Database>
  let clientP2: SupabaseClient<Database>
  let clientR1: SupabaseClient<Database>

  let sugP1Id: string

  beforeAll(async () => {
    const timestamp = Date.now()
    const emailP1 = `postulante-sug-1-${timestamp}@example.test`
    const emailP2 = `postulante-sug-2-${timestamp}@example.test`
    const emailR1 = `reclutador-sug-1-${timestamp}@example.test`

    // 1. Crear usuarios en Auth
    const { data: authP1, error: errAuthP1 } = await adminClient.auth.admin.createUser({
      email: emailP1,
      password: PASSWORD,
      email_confirm: true,
    })
    if (errAuthP1 || !authP1.user) throw new Error(`authP1 error: ${errAuthP1?.message}`)
    userP1Id = authP1.user.id
    createdAuthUserIds.push(userP1Id)

    const { data: authP2, error: errAuthP2 } = await adminClient.auth.admin.createUser({
      email: emailP2,
      password: PASSWORD,
      email_confirm: true,
    })
    if (errAuthP2 || !authP2.user) throw new Error(`authP2 error: ${errAuthP2?.message}`)
    userP2Id = authP2.user.id
    createdAuthUserIds.push(userP2Id)

    const { data: authR1, error: errAuthR1 } = await adminClient.auth.admin.createUser({
      email: emailR1,
      password: PASSWORD,
      email_confirm: true,
    })
    if (errAuthR1 || !authR1.user) throw new Error(`authR1 error: ${errAuthR1?.message}`)
    userR1Id = authR1.user.id
    createdAuthUserIds.push(userR1Id)

    // 2. Insertar en public.usuario
    const { error: errUsr } = await adminClient.from('usuario').insert([
      { id: userP1Id, email: emailP1, rol_usuario: 'POSTULANTE' },
      { id: userP2Id, email: emailP2, rol_usuario: 'POSTULANTE' },
      { id: userR1Id, email: emailR1, rol_usuario: 'RECLUTADOR' },
    ])
    if (errUsr) throw new Error(`usuario error: ${errUsr.message}`)

    // 3. Perfiles postulante
    const { data: prov, error: errProv } = await adminClient.from('provincia').select('id').limit(1).single()
    if (errProv || !prov) throw new Error('No hay provincias en el catálogo')

    postulante1Id = crypto.randomUUID()
    postulante2Id = crypto.randomUUID()

    const { error: errPerfPost } = await adminClient.from('perfil_postulante').insert([
      {
        id: postulante1Id,
        usuario_id: userP1Id,
        nombre_completo: 'Postulante Uno',
        perfil_en_busqueda: true,
        provincia_id: prov.id,
      },
      {
        id: postulante2Id,
        usuario_id: userP2Id,
        nombre_completo: 'Postulante Dos',
        perfil_en_busqueda: true,
        provincia_id: prov.id,
      },
    ])
    if (errPerfPost) throw new Error(`perfil_postulante error: ${errPerfPost.message}`)

    // 4. Perfiles técnicos para P1 y P2
    pt1Id = crypto.randomUUID()
    pt2Id = crypto.randomUUID()
    createdPerfilTecnicoIds.push(pt1Id, pt2Id)

    const { error: errPt } = await adminClient.from('perfil_tecnico').insert([
      { id: pt1Id, postulante_id: postulante1Id },
      { id: pt2Id, postulante_id: postulante2Id },
    ])
    if (errPt) throw new Error(`perfil_tecnico error: ${errPt.message}`)

    // 5. Empresa y perfil reclutador
    empresaId = crypto.randomUUID()
    createdEmpresaIds.push(empresaId)

    const { error: errEmp } = await adminClient.from('empresa').insert({
      id: empresaId,
      nombre_empresa: `Empresa Sugerencias ${timestamp}`,
    })
    if (errEmp) throw new Error(`empresa error: ${errEmp.message}`)

    reclutadorId = crypto.randomUUID()
    const { error: errPerfRec } = await adminClient.from('perfil_reclutador').insert({
      id: reclutadorId,
      usuario_id: userR1Id,
      nombre_reclutador: 'Reclutador Titular',
      empresa_id: empresaId,
    })
    if (errPerfRec) throw new Error(`perfil_reclutador error: ${errPerfRec.message}`)

    // 6. Puesto, historial_puesto y postulación de P1 al puesto
    puestoId = crypto.randomUUID()
    createdPuestoIds.push(puestoId)

    const { error: errPuesto } = await adminClient.from('puesto').insert({
      id: puestoId,
      reclutador_id: reclutadorId,
      empresa_id: empresaId,
      titulo_puesto: 'Dev Senior',
      carga_horaria: 'TIEMPO_COMPLETO',
      ubicacion: 'REMOTO',
    })
    if (errPuesto) throw new Error(`puesto error: ${errPuesto.message}`)

    historialPuestoId = crypto.randomUUID()
    createdHistorialIds.push(historialPuestoId)

    const { error: errHist } = await adminClient.from('historial_puesto').insert({
      id: historialPuestoId,
      puesto_id: puestoId,
    })
    if (errHist) throw new Error(`historial_puesto error: ${errHist.message}`)

    postulacionId = crypto.randomUUID()
    createdPostulacionIds.push(postulacionId)

    const { error: errPostulacion } = await adminClient.from('postulacion').insert({
      id: postulacionId,
      puesto_id: puestoId,
      postulante_id: postulante1Id,
      historial_puesto_id: historialPuestoId,
      estado: 'ENVIADA',
    })
    if (errPostulacion) throw new Error(`postulacion error: ${errPostulacion.message}`)

    // 7. Clientes autenticados
    const { client: cP1 } = await createAuthenticatedClient(emailP1)
    const { client: cP2 } = await createAuthenticatedClient(emailP2)
    const { client: cR1 } = await createAuthenticatedClient(emailR1)

    clientP1 = cP1
    clientP2 = cP2
    clientR1 = cR1
  })

  afterAll(async () => {
    // Limpieza en orden estricto de dependencias FK
    // 1. Filas de competencia_sugerida
    if (createdSugerenciaIds.length > 0) {
      await adminClient.from('competencia_sugerida').delete().in('id', createdSugerenciaIds)
    }

    // 2. Postulaciones
    if (createdPostulacionIds.length > 0) {
      await adminClient.from('postulacion').delete().in('id', createdPostulacionIds)
    }

    // 3. Historial puesto
    if (createdHistorialIds.length > 0) {
      await adminClient.from('historial_puesto').delete().in('id', createdHistorialIds)
    }

    // 4. Puestos
    if (createdPuestoIds.length > 0) {
      await adminClient.from('puesto').delete().in('id', createdPuestoIds)
    }

    // 5. Perfiles técnicos
    if (createdPerfilTecnicoIds.length > 0) {
      await adminClient.from('perfil_tecnico').delete().in('id', createdPerfilTecnicoIds)
    }

    // 6. Usuarios en Auth (cascada a public.usuario -> perfil_postulante / perfil_reclutador)
    for (const userId of createdAuthUserIds) {
      await adminClient.auth.admin.deleteUser(userId)
    }

    // 7. Empresas
    if (createdEmpresaIds.length > 0) {
      await adminClient.from('empresa').delete().in('id', createdEmpresaIds)
    }

    // 8. Restaurar cualquier fila de catálogo creada
    if (createdCompetenciaCatalogoIds.length > 0) {
      await adminClient.from('competencia').delete().in('id', createdCompetenciaCatalogoIds)
    }
  })

  // ─── 1. El postulante crea, actualiza, lee y borra sus sugerencias ─────────
  it('1. El postulante crea, actualiza, lee y borra sus sugerencias', async () => {
    sugP1Id = crypto.randomUUID()
    createdSugerenciaIds.push(sugP1Id)

    // Crear
    const { data: insData, error: insErr } = await clientP1.from('competencia_sugerida').insert({
      id: sugP1Id,
      perfil_tecnico_id: pt1Id,
      nombre: 'GraphQL Moderno',
      nombre_normalizado: 'graphql moderno',
      nivel: 'BASICO',
    }).select()

    expect(insErr).toBeNull()
    expect(insData).toHaveLength(1)
    expect(insData?.[0].nombre).toBe('GraphQL Moderno')

    // Leer
    const { data: readData, error: readErr } = await clientP1
      .from('competencia_sugerida')
      .select('*')
      .eq('id', sugP1Id)

    expect(readErr).toBeNull()
    expect(readData).toHaveLength(1)
    expect(readData?.[0].nombre_normalizado).toBe('graphql moderno')

    // Actualizar
    const { error: updErr } = await clientP1
      .from('competencia_sugerida')
      .update({ nivel: 'AVANZADO' })
      .eq('id', sugP1Id)

    expect(updErr).toBeNull()

    const { data: readAfterUpd } = await clientP1
      .from('competencia_sugerida')
      .select('nivel')
      .eq('id', sugP1Id)
      .single()
    expect(readAfterUpd?.nivel).toBe('AVANZADO')

    // Borrar (crear una temporal y borrarla)
    const sugTempId = crypto.randomUUID()
    await clientP1.from('competencia_sugerida').insert({
      id: sugTempId,
      perfil_tecnico_id: pt1Id,
      nombre: 'Temporal Borrado',
      nombre_normalizado: 'temporal borrado',
      nivel: 'BASICO',
    })

    const { error: delErr } = await clientP1
      .from('competencia_sugerida')
      .delete()
      .eq('id', sugTempId)

    expect(delErr).toBeNull()

    const { data: readDeleted } = await clientP1
      .from('competencia_sugerida')
      .select('id')
      .eq('id', sugTempId)
    expect(readDeleted).toHaveLength(0)
  })

  // ─── 2. Otro postulante no ve ni modifica las del primero ───────────────────
  it('2. Otro postulante no ve ni modifica las sugerencias del primero', async () => {
    // P2 intenta leer la sugerencia de P1
    const { data: readData, error: readErr } = await clientP2
      .from('competencia_sugerida')
      .select('*')
      .eq('id', sugP1Id)

    expect(readErr).toBeNull()
    expect(readData).toHaveLength(0)

    // P2 intenta actualizar la sugerencia de P1
    const { data: updData } = await clientP2
      .from('competencia_sugerida')
      .update({ nombre: 'Hackeado' })
      .eq('id', sugP1Id)
      .select()

    expect(updData).toHaveLength(0)

    // P2 intenta borrar la sugerencia de P1
    const { data: delData } = await clientP2
      .from('competencia_sugerida')
      .delete()
      .eq('id', sugP1Id)
      .select()

    expect(delData).toHaveLength(0)

    // P2 intenta insertar una sugerencia a nombre del perfil técnico de P1
    const { error: insFakeErr } = await clientP2.from('competencia_sugerida').insert({
      perfil_tecnico_id: pt1Id,
      nombre: 'Impostor Skill',
      nombre_normalizado: 'impostor skill',
      nivel: 'BASICO',
    })

    expect(insFakeErr).not.toBeNull()
    expect(insFakeErr?.code).toBe('42501')
  })

  // ─── 3. Un reclutador no ve sugerencias, ni de candidatos que se postularon ─
  it('3. Un reclutador no ve sugerencias, ni de candidatos que se postularon a sus puestos', async () => {
    // P1 está postulado al puesto de R1, pero R1 NO debe ver sus sugerencias
    const { data, error } = await clientR1
      .from('competencia_sugerida')
      .select('*')
      .eq('perfil_tecnico_id', pt1Id)

    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  // ─── 4. anon no lee nada ───────────────────────────────────────────────────
  it('4. anon no lee nada en competencia_sugerida', async () => {
    const { data, error } = await anonClient
      .from('competencia_sugerida')
      .select('*')
      .eq('id', sugP1Id)

    if (error) {
      expect(error.code).toBe('42501')
    } else {
      expect(data).toHaveLength(0)
    }
  })

  // ─── 5. Un postulante no puede insertar en competencia ─────────────────────
  it('5. Un postulante no puede insertar en el catálogo competencia (restringido a ADMIN)', async () => {
    const { error } = await clientP1.from('competencia').insert({
      nombre: 'Habilidad Directa Postulante',
    })

    expect(error).not.toBeNull()
    expect(error?.code).toBe('42501')
  })

  // ─── 6. Service role: mayúsculas en competencia falla con 23505 ────────────
  it('6. Con service role, insertar en competencia un nombre que solo cambia en mayúsculas respecto de uno existente falla con 23505', async () => {
    // Se inserta una competencia de prueba
    const testNombre = `Competencia Exclusiva ${Date.now()}`
    const { data: creada, error: errCrear } = await adminClient
      .from('competencia')
      .insert({ nombre: testNombre })
      .select('id')
      .single()

    expect(errCrear).toBeNull()
    if (creada?.id) {
      createdCompetenciaCatalogoIds.push(creada.id)
    }

    // Intentar insertar la misma competencia en minúsculas y con espacios laterales
    const { error: errDuplicada } = await adminClient.from('competencia').insert({
      nombre: `  ${testNombre.toLowerCase()}  `,
    })

    expect(errDuplicada).not.toBeNull()
    expect(errDuplicada?.code).toBe('23505')
  })
})
