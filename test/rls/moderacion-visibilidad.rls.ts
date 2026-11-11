import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import {
  PASSWORD,
  adminClient,
  anonClient,
  createAuthenticatedClient,
} from './helpers'

describe('Suite RLS — Moderación del admin y regla de visibilidad (H-230)', () => {
  const createdAuthUserIds: string[] = []
  const createdEmpresaIds: string[] = []
  const createdPuestoIds: string[] = []
  const createdHistorialIds: string[] = []
  const createdPostulacionIds: string[] = []
  const createdInformeIds: string[] = []
  const createdTestDominanteIds: string[] = []
  const createdTestIds: string[] = []
  const createdPerfilPostulanteIds: string[] = []

  let provinciaId: string
  let eneatipoId: string

  // Clientes
  let clientPostulanteA: SupabaseClient<Database>
  let clientReclutador: SupabaseClient<Database>

  // IDs de perfiles
  let perfilPostulanteAId: string
  let perfilSinTestId: string
  let perfilSinInformeListoId: string
  let perfilBloqueadoId: string
  let perfilFueraBusquedaId: string
  let perfilCompletoId: string
  let perfilBloqueadoPostuladoId: string

  beforeAll(async () => {
    // 0. Obtener catálogo básico (provincia y eneatipo)
    const { data: prov, error: errProv } = await adminClient
      .from('provincia')
      .select('id')
      .limit(1)
      .single()
    if (errProv || !prov) throw new Error(`No hay provincia en catálogo: ${errProv?.message}`)
    provinciaId = prov.id

    const { data: enea, error: errEnea } = await adminClient
      .from('eneatipo')
      .select('id')
      .limit(1)
      .single()
    if (errEnea || !enea) throw new Error(`No hay eneatipo en catálogo: ${errEnea?.message}`)
    eneatipoId = enea.id

    const timestamp = Date.now()

    // Helper para crear usuario en auth y en public.usuario
    async function crearUsuario(emailPrefix: string, rol: 'POSTULANTE' | 'RECLUTADOR') {
      const email = `${emailPrefix}-${timestamp}@example.test`
      const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
      })
      if (authErr || !authData.user) {
        throw new Error(`Error creando auth user ${email}: ${authErr?.message}`)
      }
      const userId = authData.user.id
      createdAuthUserIds.push(userId)

      const { error: usrErr } = await adminClient.from('usuario').insert({
        id: userId,
        email,
        rol_usuario: rol,
      })
      if (usrErr) throw new Error(`Error insertando public.usuario ${email}: ${usrErr.message}`)

      return { userId, email }
    }

    // 1. Usuario Postulante A (para probar permisos UPDATE)
    const { userId: userAId, email: emailA } = await crearUsuario('post-a-h230', 'POSTULANTE')
    perfilPostulanteAId = crypto.randomUUID()
    createdPerfilPostulanteIds.push(perfilPostulanteAId)
    const { error: errA } = await adminClient.from('perfil_postulante').insert({
      id: perfilPostulanteAId,
      usuario_id: userAId,
      nombre_completo: 'Postulante A',
      provincia_id: provinciaId,
      perfil_en_busqueda: true,
      bloqueado_por_admin: false,
    })
    if (errA) throw new Error(`Error insertando perfil A: ${errA.message}`)

    const authClA = await createAuthenticatedClient(emailA)
    clientPostulanteA = authClA.client

    // 2. Reclutador R con empresa y puesto
    const { userId: userRId, email: emailR } = await crearUsuario('rec-h230', 'RECLUTADOR')
    const empresaId = crypto.randomUUID()
    createdEmpresaIds.push(empresaId)
    const { error: errEmp } = await adminClient.from('empresa').insert({ id: empresaId, nombre_empresa: 'Empresa H230 Test' })
    if (errEmp) throw new Error(`Error insertando empresa: ${errEmp.message}`)

    const perfilRecId = crypto.randomUUID()
    const { error: errRec } = await adminClient.from('perfil_reclutador').insert({
      id: perfilRecId,
      usuario_id: userRId,
      nombre_reclutador: 'Reclutador R',
      empresa_id: empresaId,
    })
    if (errRec) throw new Error(`Error insertando perfil reclutador: ${errRec.message}`)

    const puestoId = crypto.randomUUID()
    createdPuestoIds.push(puestoId)
    const { error: errPuesto } = await adminClient.from('puesto').insert({
      id: puestoId,
      empresa_id: empresaId,
      reclutador_id: perfilRecId,
      titulo_puesto: 'Puesto H230 Test',
      carga_horaria: 'TIEMPO_COMPLETO',
      ubicacion: 'REMOTO',
      activo: true,
    })
    if (errPuesto) throw new Error(`Error insertando puesto: ${errPuesto.message}`)

    const historialId = crypto.randomUUID()
    createdHistorialIds.push(historialId)
    const { error: errHist } = await adminClient.from('historial_puesto').insert({
      id: historialId,
      puesto_id: puestoId,
    })
    if (errHist) throw new Error(`Error insertando historial: ${errHist.message}`)

    const authClR = await createAuthenticatedClient(emailR)
    clientReclutador = authClR.client

    // Helper para crear postulante con combinaciones de visibilidad
    async function setupPostulante({
      prefix,
      enBusqueda,
      bloqueado,
      conTest,
      estadoInforme,
    }: {
      prefix: string
      enBusqueda: boolean
      bloqueado: boolean
      conTest: boolean
      estadoInforme: 'LISTO' | 'PENDIENTE' | 'ERROR' | null
    }) {
      const { userId } = await crearUsuario(prefix, 'POSTULANTE')
      const postulanteId = crypto.randomUUID()
      createdPerfilPostulanteIds.push(postulanteId)

      const { error: errPerf } = await adminClient.from('perfil_postulante').insert({
        id: postulanteId,
        usuario_id: userId,
        nombre_completo: `Postulante ${prefix}`,
        provincia_id: provinciaId,
        perfil_en_busqueda: enBusqueda,
        bloqueado_por_admin: bloqueado,
      })
      if (errPerf) throw new Error(`Error insertando perfil ${prefix}: ${errPerf.message}`)

      if (conTest) {
        const testId = crypto.randomUUID()
        createdTestIds.push(testId)
        const { error: errT } = await adminClient.from('test_eneagrama').insert({
          id: testId,
          postulante_id: postulanteId,
        })
        if (errT) throw new Error(`Error insertando test ${prefix}: ${errT.message}`)

        const dominanteId = crypto.randomUUID()
        createdTestDominanteIds.push(dominanteId)
        const { error: errD } = await adminClient.from('test_eneagrama_dominante').insert({
          id: dominanteId,
          test_eneagrama_id: testId,
          eneatipo_id: eneatipoId,
          puntaje_crudo: 40,
          porcentaje: 80,
        })
        if (errD) throw new Error(`Error insertando dominante ${prefix}: ${errD.message}`)
      }

      if (estadoInforme) {
        const infId = crypto.randomUUID()
        createdInformeIds.push(infId)
        const { error: errI } = await adminClient.from('informe_personalidad').insert({
          id: infId,
          postulante_id: postulanteId,
          estado_informe: estadoInforme,
        })
        if (errI) throw new Error(`Error insertando informe ${prefix}: ${errI.message}`)
      }

      return postulanteId
    }

    // 3. Postulante sin test (en búsqueda, no bloqueado)
    perfilSinTestId = await setupPostulante({
      prefix: 'sin-test',
      enBusqueda: true,
      bloqueado: false,
      conTest: false,
      estadoInforme: null,
    })

    // 4. Postulante con test pero sin informe LISTO (estado PENDIENTE)
    perfilSinInformeListoId = await setupPostulante({
      prefix: 'sin-informe',
      enBusqueda: true,
      bloqueado: false,
      conTest: true,
      estadoInforme: 'PENDIENTE',
    })

    // 5. Postulante bloqueado por admin (con test e informe LISTO)
    perfilBloqueadoId = await setupPostulante({
      prefix: 'bloqueado',
      enBusqueda: true,
      bloqueado: true,
      conTest: true,
      estadoInforme: 'LISTO',
    })

    // 6. Postulante fuera de búsqueda (con test e informe LISTO, pero perfil_en_busqueda = false)
    perfilFueraBusquedaId = await setupPostulante({
      prefix: 'fuera-busqueda',
      enBusqueda: false,
      bloqueado: false,
      conTest: true,
      estadoInforme: 'LISTO',
    })

    // 7. Postulante completo (en búsqueda, no bloqueado, test con dominante, informe LISTO)
    perfilCompletoId = await setupPostulante({
      prefix: 'completo',
      enBusqueda: true,
      bloqueado: false,
      conTest: true,
      estadoInforme: 'LISTO',
    })

    // 8. Postulante bloqueado por admin pero que se postuló al puesto del reclutador R
    perfilBloqueadoPostuladoId = await setupPostulante({
      prefix: 'bloq-postulado',
      enBusqueda: true,
      bloqueado: true,
      conTest: true,
      estadoInforme: 'LISTO',
    })

    const postuId = crypto.randomUUID()
    createdPostulacionIds.push(postuId)
    const { error: errPostu } = await adminClient.from('postulacion').insert({
      id: postuId,
      puesto_id: puestoId,
      postulante_id: perfilBloqueadoPostuladoId,
      historial_puesto_id: historialId,
      estado: 'ENVIADA',
    })
    if (errPostu) throw new Error(`Error insertando postulacion: ${errPostu.message}`)
  })

  afterAll(async () => {
    // Limpieza en orden estricto de dependencias FK
    if (createdPostulacionIds.length > 0) {
      await adminClient.from('postulacion').delete().in('id', createdPostulacionIds)
    }
    if (createdHistorialIds.length > 0) {
      await adminClient.from('historial_puesto').delete().in('id', createdHistorialIds)
    }
    if (createdPuestoIds.length > 0) {
      await adminClient.from('puesto').delete().in('id', createdPuestoIds)
    }
    if (createdInformeIds.length > 0) {
      await adminClient.from('informe_personalidad').delete().in('id', createdInformeIds)
    }
    if (createdTestDominanteIds.length > 0) {
      await adminClient.from('test_eneagrama_dominante').delete().in('id', createdTestDominanteIds)
    }
    if (createdTestIds.length > 0) {
      await adminClient.from('test_eneagrama').delete().in('id', createdTestIds)
    }
    for (const userId of createdAuthUserIds) {
      await adminClient.auth.admin.deleteUser(userId)
    }
    if (createdEmpresaIds.length > 0) {
      await adminClient.from('empresa').delete().in('id', createdEmpresaIds)
    }
  })

  describe('Permisos granulares de columna para authenticated', () => {
    it('el postulante NO puede modificar bloqueado_por_admin (error 42501)', async () => {
      const { error } = await clientPostulanteA
        .from('perfil_postulante')
        .update({ bloqueado_por_admin: true })
        .eq('id', perfilPostulanteAId)

      expect(error).not.toBeNull()
      expect(error?.code).toBe('42501')
      expect(error?.message).toMatch(/permission denied/i)
    })

    it('el postulante NO puede modificar usuario_id (error 42501)', async () => {
      const { error } = await clientPostulanteA
        .from('perfil_postulante')
        .update({ usuario_id: crypto.randomUUID() })
        .eq('id', perfilPostulanteAId)

      expect(error).not.toBeNull()
      expect(error?.code).toBe('42501')
      expect(error?.message).toMatch(/permission denied/i)
    })

    it('el postulante NO puede modificar id (error 42501)', async () => {
      const { error } = await clientPostulanteA
        .from('perfil_postulante')
        .update({ id: crypto.randomUUID() })
        .eq('id', perfilPostulanteAId)

      expect(error).not.toBeNull()
      expect(error?.code).toBe('42501')
      expect(error?.message).toMatch(/permission denied/i)
    })

    it('el postulante SÍ puede modificar campos permitidos (telefono y perfil_en_busqueda)', async () => {
      const { error } = await clientPostulanteA
        .from('perfil_postulante')
        .update({
          telefono: '+5491199887766',
          perfil_en_busqueda: false,
        })
        .eq('id', perfilPostulanteAId)

      expect(error).toBeNull()

      // Verificar que se persistió
      const { data } = await adminClient
        .from('perfil_postulante')
        .select('telefono, perfil_en_busqueda')
        .eq('id', perfilPostulanteAId)
        .single()

      expect(data?.telefono).toBe('+5491199887766')
      expect(data?.perfil_en_busqueda).toBe(false)
    })
  })

  describe('Regla de visibilidad del reclutador en RLS (postulante_select_propio)', () => {
    it('el reclutador NO ve a un postulante sin test completado', async () => {
      const { data } = await clientReclutador
        .from('perfil_postulante')
        .select('id')
        .eq('id', perfilSinTestId)

      expect(data).toEqual([])
    })

    it('el reclutador NO ve a un postulante con test pero sin informe en estado LISTO', async () => {
      const { data } = await clientReclutador
        .from('perfil_postulante')
        .select('id')
        .eq('id', perfilSinInformeListoId)

      expect(data).toEqual([])
    })

    it('el reclutador NO ve a un postulante bloqueado por el admin', async () => {
      const { data } = await clientReclutador
        .from('perfil_postulante')
        .select('id')
        .eq('id', perfilBloqueadoId)

      expect(data).toEqual([])
    })

    it('el reclutador NO ve a un postulante con perfil_en_busqueda = false', async () => {
      const { data } = await clientReclutador
        .from('perfil_postulante')
        .select('id')
        .eq('id', perfilFueraBusquedaId)

      expect(data).toEqual([])
    })

    it('el reclutador SÍ ve al postulante que cumple todas las condiciones', async () => {
      const { data, error } = await clientReclutador
        .from('perfil_postulante')
        .select('id, nombre_completo')
        .eq('id', perfilCompletoId)

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect(data?.[0].id).toBe(perfilCompletoId)
    })

    it('el reclutador SÍ ve al postulante bloqueado que se postuló a uno de sus puestos', async () => {
      const { data, error } = await clientReclutador
        .from('perfil_postulante')
        .select('id, nombre_completo')
        .eq('id', perfilBloqueadoPostuladoId)

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect(data?.[0].id).toBe(perfilBloqueadoPostuladoId)
    })
  })

  describe('Permisos para anon (no autenticado)', () => {
    it('anon NO puede insertar en perfil_postulante', async () => {
      const { error } = await anonClient
        .from('perfil_postulante')
        .insert({
          id: crypto.randomUUID(),
          usuario_id: crypto.randomUUID(),
          nombre_completo: 'Anon Intruso',
          provincia_id: provinciaId,
        })

      expect(error).not.toBeNull()
      expect(error?.message).toMatch(/permission denied|violates row-level security|privilege/i)
    })

    it('anon NO puede actualizar en perfil_postulante', async () => {
      const { error } = await anonClient
        .from('perfil_postulante')
        .update({ nombre_completo: 'Nombre Hackeado' })
        .eq('id', perfilCompletoId)

      expect(error).not.toBeNull()
      expect(error?.message).toMatch(/permission denied|privilege/i)
    })
  })
})
