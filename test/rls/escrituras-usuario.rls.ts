import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import {
  PASSWORD,
  adminClient,
  createAuthenticatedClient,
} from './helpers'

describe('Suite RLS — Escrituras del postulante y del reclutador (H-100, H-119)', () => {
  const createdAuthUserIds: string[] = []
  const createdEmpresaIds: string[] = []
  const createdPuestoIds: string[] = []
  const createdNotaIds: string[] = []

  let userP1Id: string
  let userP2Id: string
  let userR1Id: string
  let userR2Id: string

  let postulante1Id: string
  let postulante2Id: string

  let reclutador1Id: string
  let reclutador2Id: string

  let empresa1Id: string
  let empresa2Id: string

  let compCatalogId: string

  let clientP1: SupabaseClient<Database>
  let clientP2: SupabaseClient<Database>
  let clientR1: SupabaseClient<Database>
  let clientR2: SupabaseClient<Database>

  let pt1Id: string

  beforeAll(async () => {
    // Obtener una competencia existente del catálogo
    const { data: compCatalog, error: errCompCat } = await adminClient
      .from('competencia')
      .select('id')
      .limit(1)
      .single()
    if (errCompCat || !compCatalog) {
      throw new Error(`No se pudo obtener competencia del catálogo: ${errCompCat?.message}`)
    }
    compCatalogId = compCatalog.id

    const timestamp = Date.now()
    const emailP1 = `postulante-1-${timestamp}@example.test`
    const emailP2 = `postulante-2-${timestamp}@example.test`
    const emailR1 = `reclutador-1-${timestamp}@example.test`
    const emailR2 = `reclutador-2-${timestamp}@example.test`

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
      { id: userP1Id, email: emailP1, rol_usuario: 'POSTULANTE' },
      { id: userP2Id, email: emailP2, rol_usuario: 'POSTULANTE' },
      { id: userR1Id, email: emailR1, rol_usuario: 'RECLUTADOR' },
      { id: userR2Id, email: emailR2, rol_usuario: 'RECLUTADOR' },
    ])
    if (errUsr) throw new Error(`usuario error: ${errUsr.message}`)

    // 3. Insertar perfiles postulante (sin perfil_tecnico inicial; se crea en el test 1)
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

    // 4. Insertar empresas y perfiles reclutador
    empresa1Id = crypto.randomUUID()
    empresa2Id = crypto.randomUUID()
    createdEmpresaIds.push(empresa1Id, empresa2Id)

    const { error: errEmp } = await adminClient.from('empresa').insert([
      { id: empresa1Id, nombre_empresa: 'Empresa Test R1' },
      { id: empresa2Id, nombre_empresa: 'Empresa Test R2' },
    ])
    if (errEmp) throw new Error(`empresa error: ${errEmp.message}`)

    reclutador1Id = crypto.randomUUID()
    reclutador2Id = crypto.randomUUID()
    const { error: errPerfRec } = await adminClient.from('perfil_reclutador').insert([
      { id: reclutador1Id, usuario_id: userR1Id, nombre_reclutador: 'Reclutador 1', empresa_id: empresa1Id },
      { id: reclutador2Id, usuario_id: userR2Id, nombre_reclutador: 'Reclutador 2', empresa_id: empresa2Id },
    ])
    if (errPerfRec) throw new Error(`perfil_reclutador error: ${errPerfRec.message}`)

    // 5. Conectar clientes autenticados
    const authClP1 = await createAuthenticatedClient(emailP1)
    clientP1 = authClP1.client

    const authClP2 = await createAuthenticatedClient(emailP2)
    clientP2 = authClP2.client

    const authClR1 = await createAuthenticatedClient(emailR1)
    clientR1 = authClR1.client

    const authClR2 = await createAuthenticatedClient(emailR2)
    clientR2 = authClR2.client
  })

  // Limpieza en orden estricto de dependencias FK
  afterAll(async () => {
    // 1. Notas privadas y postulaciones / puestos
    if (createdNotaIds.length > 0) {
      await adminClient.from('nota_privada').delete().in('id', createdNotaIds)
    }
    const puestos = createdPuestoIds.filter(Boolean)
    if (puestos.length > 0) {
      await adminClient.from('postulacion').delete().in('puesto_id', puestos)
      await adminClient.from('puesto').delete().in('id', puestos)
    }

    // 2. Usuarios en Auth (cascada a public.usuario -> perfil_postulante / perfil_reclutador -> perfil_tecnico)
    for (const userId of createdAuthUserIds) {
      await adminClient.auth.admin.deleteUser(userId)
    }

    // 3. Empresas
    if (createdEmpresaIds.length > 0) {
      await adminClient.from('empresa').delete().in('id', createdEmpresaIds)
    }
  })

  // ─── 1. Postulante crea su perfil técnico y subtablas ─────────────────────────
  it('1. Un postulante logueado puede crear su perfil_tecnico y luego insertar formación, curso, experiencia, idioma y competencias en él', async () => {
    // Crear perfil_tecnico propio
    const { data: pt, error: errPt } = await clientP1
      .from('perfil_tecnico')
      .insert({ postulante_id: postulante1Id })
      .select('id')
      .single()

    expect(errPt).toBeNull()
    expect(pt?.id).toBeDefined()
    pt1Id = pt!.id

    // Insertar formación académica
    const { data: form, error: errForm } = await clientP1
      .from('formacion_academica')
      .insert({
        perfil_tecnico_id: pt1Id,
        institucion: 'Universidad Nacional',
        titulo: 'Licenciatura en Computación',
        fecha_graduacion: '2022-12-01',
      })
      .select('id')
      .single()

    expect(errForm).toBeNull()
    expect(form?.id).toBeDefined()

    // Insertar curso
    const { data: curso, error: errCurso } = await clientP1
      .from('curso')
      .insert({
        perfil_tecnico_id: pt1Id,
        nombre: 'Arquitectura de Software',
        institucion: 'Plataforma Edu',
        duracion_horas: 40,
      })
      .select('id')
      .single()

    expect(errCurso).toBeNull()
    expect(curso?.id).toBeDefined()

    // Insertar experiencia laboral
    const { data: exp, error: errExp } = await clientP1
      .from('experiencia_laboral')
      .insert({
        perfil_tecnico_id: pt1Id,
        empresa: 'Empresa Alfa',
        puesto: 'Backend Developer',
        fecha_inicio: '2023-01-01',
      })
      .select('id')
      .single()

    expect(errExp).toBeNull()
    expect(exp?.id).toBeDefined()

    // Insertar idioma
    const { data: idioma, error: errIdioma } = await clientP1
      .from('idioma')
      .insert({
        perfil_tecnico_id: pt1Id,
        nombre: 'Inglés',
        nivel_idioma: 'AVANZADO',
      })
      .select('id')
      .single()

    expect(errIdioma).toBeNull()
    expect(idioma?.id).toBeDefined()

    // Insertar competencia
    const { data: comp, error: errComp } = await clientP1
      .from('postulante_competencia')
      .insert({
        perfil_tecnico_id: pt1Id,
        competencia_id: compCatalogId,
        nivel: 'AVANZADO',
      })
      .select('id')
      .single()

    expect(errComp).toBeNull()
    expect(comp?.id).toBeDefined()
  })

  // ─── 2. Postulante no puede insertar en perfil técnico ajeno ──────────────────
  it('2. Un postulante NO puede insertar en ninguna de esas tablas apuntando al perfil_tecnico_id de otro postulante (42501)', async () => {
    expect(pt1Id).toBeDefined()

    // Intento de insertar formación en perfil_tecnico ajeno
    const { error: errForm } = await clientP2
      .from('formacion_academica')
      .insert({
        perfil_tecnico_id: pt1Id,
        institucion: 'Universidad Invasora',
        titulo: 'Hacking 101',
      })
    expect(errForm).not.toBeNull()
    expect(errForm?.code).toBe('42501')

    // Intento de insertar curso en perfil_tecnico ajeno
    const { error: errCurso } = await clientP2
      .from('curso')
      .insert({
        perfil_tecnico_id: pt1Id,
        nombre: 'Curso Invasor',
        institucion: 'Invasores Inc',
      })
    expect(errCurso).not.toBeNull()
    expect(errCurso?.code).toBe('42501')

    // Intento de insertar experiencia en perfil_tecnico ajeno
    const { error: errExp } = await clientP2
      .from('experiencia_laboral')
      .insert({
        perfil_tecnico_id: pt1Id,
        empresa: 'Empresa Falsa',
        puesto: 'Infiltrado',
        fecha_inicio: '2023-01-01',
      })
    expect(errExp).not.toBeNull()
    expect(errExp?.code).toBe('42501')

    // Intento de insertar idioma en perfil_tecnico ajeno
    const { error: errIdioma } = await clientP2
      .from('idioma')
      .insert({
        perfil_tecnico_id: pt1Id,
        nombre: 'Francés',
        nivel_idioma: 'BASICO',
      })
    expect(errIdioma).not.toBeNull()
    expect(errIdioma?.code).toBe('42501')

    // Intento de insertar competencia en perfil_tecnico ajeno
    const { error: errComp } = await clientP2
      .from('postulante_competencia')
      .insert({
        perfil_tecnico_id: pt1Id,
        competencia_id: compCatalogId,
        nivel: 'BASICO',
      })
    expect(errComp).not.toBeNull()
    expect(errComp?.code).toBe('42501')
  })

  // ─── 3. Postulante no puede crear perfil técnico con postulante_id de otro ────
  it('3. Un postulante NO puede crear un perfil_tecnico con el postulante_id de otro (42501)', async () => {
    const { error: errPt } = await clientP2
      .from('perfil_tecnico')
      .insert({ postulante_id: postulante1Id })

    expect(errPt).not.toBeNull()
    expect(errPt?.code).toBe('42501')
  })

  // ─── 4. Reclutador puede insertar nota con su propio reclutador_id ────────────
  it('4. Un reclutador puede insertar una nota_privada con su propio reclutador_id', async () => {
    const { data: nota, error: errNota } = await clientR1
      .from('nota_privada')
      .insert({
        reclutador_id: reclutador1Id,
        postulante_id: postulante1Id,
        contenido: 'Excelente perfil para entrevistas técnicas.',
      })
      .select('id')
      .single()

    expect(errNota).toBeNull()
    expect(nota?.id).toBeDefined()
    if (nota?.id) {
      createdNotaIds.push(nota.id)
    }
  })

  // ─── 5. Reclutador no puede insertar nota con reclutador_id ajeno ──────────────
  it('5. Un reclutador NO puede insertar una nota con el reclutador_id de otro (42501)', async () => {
    const { error: errNota } = await clientR2
      .from('nota_privada')
      .insert({
        reclutador_id: reclutador1Id, // R2 intenta insertar haciéndose pasar por R1
        postulante_id: postulante1Id,
        contenido: 'Intento de inserción con reclutador_id ajeno.',
      })

    expect(errNota).not.toBeNull()
    expect(errNota?.code).toBe('42501')
  })
})
