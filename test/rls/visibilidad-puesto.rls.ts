import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database.types'
import {
  PASSWORD,
  adminClient,
  anonClient,
  createAuthenticatedClient,
} from './helpers'

const TOKEN_FORMATO = /^[A-Za-z0-9_-]{32}$/

describe('Suite RLS — Visibilidad de puestos y enlace para compartir', () => {
  const createdAuthUserIds: string[] = []
  const createdEmpresaIds: string[] = []
  const createdPuestoIds: string[] = []
  const createdCarreraIds: string[] = []
  const createdPerfilPostulanteIds: string[] = []
  const createdPerfilReclutadorIds: string[] = []
  const createdHistorialIds: string[] = []
  const createdPostulacionIds: string[] = []

  let clientOwner: SupabaseClient<Database>
  let clientOtroReclutador: SupabaseClient<Database>
  let clientPostulante: SupabaseClient<Database>
  let clientPostulado: SupabaseClient<Database>
  let clientAdmin: SupabaseClient<Database>

  let puestoPublicoId: string
  let puestoPrivadoId: string
  let puestoPausadoId: string
  let puestoAjenoPrivadoId: string

  let formularioPrivadoId: string
  let preguntaPrivadaId: string
  let opcionPrivadaId: string

  async function tokenDe(puestoId: string) {
    const { data, error } = await adminClient
      .from('puesto_enlace')
      .select('token')
      .eq('puesto_id', puestoId)
      .single()
    if (error || !data) throw new Error(`Sin enlace para ${puestoId}: ${error?.message}`)
    return data.token
  }

  beforeAll(async () => {
    const { data: prov, error: errProv } = await adminClient
      .from('provincia')
      .select('id')
      .limit(1)
      .single()
    if (errProv || !prov) throw new Error(`No hay provincia en catálogo: ${errProv?.message}`)
    const provinciaId = prov.id

    const timestamp = Date.now()

    async function crearUsuario(prefix: string, rol: 'POSTULANTE' | 'RECLUTADOR' | 'ADMIN') {
      const email = `${prefix}-${timestamp}@example.test`
      const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
      })
      if (authErr || !authData.user) throw new Error(`Error creando auth user ${email}: ${authErr?.message}`)
      createdAuthUserIds.push(authData.user.id)

      const { error: usrErr } = await adminClient
        .from('usuario')
        .insert({ id: authData.user.id, email, rol_usuario: rol })
      if (usrErr) throw new Error(`Error insertando public.usuario ${email}: ${usrErr.message}`)

      return { userId: authData.user.id, email }
    }

    async function crearReclutador(prefix: string) {
      const { userId, email } = await crearUsuario(prefix, 'RECLUTADOR')
      const empresaId = crypto.randomUUID()
      createdEmpresaIds.push(empresaId)
      const { error: errEmp } = await adminClient
        .from('empresa')
        .insert({ id: empresaId, nombre_empresa: `Empresa ${prefix}` })
      if (errEmp) throw new Error(`Error insertando empresa: ${errEmp.message}`)

      const perfilId = crypto.randomUUID()
      createdPerfilReclutadorIds.push(perfilId)
      const { error: errRec } = await adminClient.from('perfil_reclutador').insert({
        id: perfilId,
        usuario_id: userId,
        nombre_reclutador: prefix,
        empresa_id: empresaId,
      })
      if (errRec) throw new Error(`Error insertando perfil reclutador: ${errRec.message}`)

      const { client } = await createAuthenticatedClient(email)
      return { empresaId, perfilId, client }
    }

    async function crearPostulante(prefix: string) {
      const { userId, email } = await crearUsuario(prefix, 'POSTULANTE')
      const perfilId = crypto.randomUUID()
      createdPerfilPostulanteIds.push(perfilId)
      const { error } = await adminClient.from('perfil_postulante').insert({
        id: perfilId,
        usuario_id: userId,
        nombre_completo: prefix,
        provincia_id: provinciaId,
      })
      if (error) throw new Error(`Error insertando perfil postulante: ${error.message}`)

      const { client } = await createAuthenticatedClient(email)
      return { perfilId, client }
    }

    async function crearPuesto(
      empresaId: string,
      reclutadorId: string,
      titulo: string,
      extra: Partial<Database['public']['Tables']['puesto']['Insert']> = {},
    ) {
      const id = crypto.randomUUID()
      createdPuestoIds.push(id)
      const { error } = await adminClient.from('puesto').insert({
        id,
        empresa_id: empresaId,
        reclutador_id: reclutadorId,
        titulo_puesto: titulo,
        carga_horaria: 'TIEMPO_COMPLETO',
        ubicacion: 'REMOTO',
        activo: true,
        ...extra,
      })
      if (error) throw new Error(`Error insertando puesto ${titulo}: ${error.message}`)
      return id
    }

    // Carrera propia para no depender del catálogo sembrado.
    const carreraId = crypto.randomUUID()
    createdCarreraIds.push(carreraId)
    const { error: errCarrera } = await adminClient
      .from('carrera')
      .insert({ id: carreraId, nombre: `Carrera visibilidad ${timestamp}` })
    if (errCarrera) throw new Error(`Error insertando carrera: ${errCarrera.message}`)

    // Actores
    const owner = await crearReclutador('rec-owner-vis')
    clientOwner = owner.client
    const otro = await crearReclutador('rec-otro-vis')
    clientOtroReclutador = otro.client
    const sinPostulacion = await crearPostulante('post-libre-vis')
    clientPostulante = sinPostulacion.client
    const postulado = await crearPostulante('post-postulado-vis')
    clientPostulado = postulado.client

    const { email: emailAdmin } = await crearUsuario('admin-vis', 'ADMIN')
    clientAdmin = (await createAuthenticatedClient(emailAdmin)).client

    // Puestos. El que no se marca queda PUBLICA por default (D8).
    puestoPublicoId = await crearPuesto(owner.empresaId, owner.perfilId, 'Público vis')
    puestoPrivadoId = await crearPuesto(owner.empresaId, owner.perfilId, 'Privado vis', {
      visibilidad: 'PRIVADA',
    })
    puestoPausadoId = await crearPuesto(owner.empresaId, owner.perfilId, 'Público pausado vis', {
      activo: false,
    })
    puestoAjenoPrivadoId = await crearPuesto(otro.empresaId, otro.perfilId, 'Ajeno privado vis', {
      visibilidad: 'PRIVADA',
    })

    // Hijos del puesto privado: carrera y preselector completo.
    const { error: errCarreras } = await adminClient.from('puesto_carrera').insert([
      { puesto_id: puestoPrivadoId, carrera_id: carreraId },
      { puesto_id: puestoPublicoId, carrera_id: carreraId },
    ])
    if (errCarreras) throw errCarreras

    formularioPrivadoId = crypto.randomUUID()
    const { error: errForm } = await adminClient
      .from('formulario_preselector')
      .insert({ id: formularioPrivadoId, puesto_id: puestoPrivadoId })
    if (errForm) throw new Error(`Error insertando formulario: ${errForm.message}`)

    preguntaPrivadaId = crypto.randomUUID()
    const { error: errPreg } = await adminClient.from('pregunta_preselector').insert({
      id: preguntaPrivadaId,
      formulario_id: formularioPrivadoId,
      texto: '¿Disponibilidad?',
      tipo: 'OPCIONES',
      orden: 1,
    })
    if (errPreg) throw new Error(`Error insertando pregunta: ${errPreg.message}`)

    opcionPrivadaId = crypto.randomUUID()
    const { error: errOpc } = await adminClient.from('opcion_pregunta_preselector').insert({
      id: opcionPrivadaId,
      pregunta_id: preguntaPrivadaId,
      texto: 'Inmediata',
      orden: 1,
    })
    if (errOpc) throw new Error(`Error insertando opción: ${errOpc.message}`)

    // El segundo postulante ya se postuló al puesto privado (D6).
    const historialId = crypto.randomUUID()
    createdHistorialIds.push(historialId)
    const { error: errHist } = await adminClient
      .from('historial_puesto')
      .insert({ id: historialId, puesto_id: puestoPrivadoId })
    if (errHist) throw new Error(`Error insertando historial: ${errHist.message}`)

    const postulacionId = crypto.randomUUID()
    createdPostulacionIds.push(postulacionId)
    const { error: errPostu } = await adminClient.from('postulacion').insert({
      id: postulacionId,
      puesto_id: puestoPrivadoId,
      postulante_id: postulado.perfilId,
      historial_puesto_id: historialId,
      estado: 'ENVIADA',
    })
    if (errPostu) throw new Error(`Error insertando postulacion: ${errPostu.message}`)
  })

  afterAll(async () => {
    if (createdPostulacionIds.length > 0) {
      await adminClient.from('postulacion').delete().in('id', createdPostulacionIds)
    }
    if (createdHistorialIds.length > 0) {
      await adminClient.from('historial_puesto').delete().in('id', createdHistorialIds)
    }
    // opciones, preguntas y formulario cuelgan del puesto; puesto_carrera y
    // puesto_enlace se borran con él (CASCADE).
    if (opcionPrivadaId) await adminClient.from('opcion_pregunta_preselector').delete().eq('id', opcionPrivadaId)
    if (preguntaPrivadaId) await adminClient.from('pregunta_preselector').delete().eq('id', preguntaPrivadaId)
    if (formularioPrivadoId) await adminClient.from('formulario_preselector').delete().eq('id', formularioPrivadoId)
    if (createdPuestoIds.length > 0) {
      await adminClient.from('puesto_carrera').delete().in('puesto_id', createdPuestoIds)
      await adminClient.from('puesto').delete().in('id', createdPuestoIds)
    }
    if (createdCarreraIds.length > 0) {
      await adminClient.from('carrera').delete().in('id', createdCarreraIds)
    }
    if (createdPerfilPostulanteIds.length > 0) {
      await adminClient.from('perfil_postulante').delete().in('id', createdPerfilPostulanteIds)
    }
    if (createdPerfilReclutadorIds.length > 0) {
      await adminClient.from('perfil_reclutador').delete().in('id', createdPerfilReclutadorIds)
    }
    for (const userId of createdAuthUserIds) {
      await adminClient.auth.admin.deleteUser(userId)
    }
    if (createdEmpresaIds.length > 0) {
      await adminClient.from('empresa').delete().in('id', createdEmpresaIds)
    }
  })

  const ids = (rows: { id: string }[] | null) => (rows ?? []).map((r) => r.id)

  describe('Alta: columna, default y trigger de enlace', () => {
    it('un puesto sin visibilidad explícita queda PUBLICA', async () => {
      const { data } = await adminClient
        .from('puesto')
        .select('visibilidad')
        .eq('id', puestoPublicoId)
        .single()
      expect(data?.visibilidad).toBe('PUBLICA')
    })

    it('el trigger crea un enlace de 32 caracteres base64url por cada puesto nuevo', async () => {
      for (const id of [puestoPublicoId, puestoPrivadoId, puestoPausadoId]) {
        expect(await tokenDe(id)).toMatch(TOKEN_FORMATO)
      }
      const tokens = await Promise.all([puestoPublicoId, puestoPrivadoId, puestoPausadoId].map(tokenDe))
      expect(new Set(tokens).size).toBe(tokens.length)
    })

    it('no queda ningún puesto sin enlace (backfill + trigger)', async () => {
      const { data: puestos } = await adminClient.from('puesto').select('id')
      const { data: enlaces } = await adminClient.from('puesto_enlace').select('puesto_id')
      const conEnlace = new Set((enlaces ?? []).map((e) => e.puesto_id))
      const sinEnlace = (puestos ?? []).filter((p) => !conEnlace.has(p.id))
      expect(sinEnlace).toEqual([])
    })
  })

  describe('puesto — anon', () => {
    it('anon ve el puesto público y NO el privado', async () => {
      const { data, error } = await anonClient
        .from('puesto')
        .select('id')
        .in('id', [puestoPublicoId, puestoPrivadoId, puestoAjenoPrivadoId])
      expect(error).toBeNull()
      expect(ids(data)).toEqual([puestoPublicoId])
    })

    it('anon no ve un puesto público pausado (comportamiento previo intacto)', async () => {
      const { data } = await anonClient.from('puesto').select('id').eq('id', puestoPausadoId)
      expect(data).toEqual([])
    })

    it('anon no obtiene filas de puesto_enlace', async () => {
      const { data, error } = await anonClient.from('puesto_enlace').select('token')
      // Sin GRANT para anon: el acceso se rechaza por permisos, no por RLS.
      expect(data ?? []).toEqual([])
      expect(error).not.toBeNull()
      expect(error?.code).toBe('42501')
    })

    it('anon no ve las tablas hijas del puesto privado', async () => {
      const { data: carreras } = await anonClient
        .from('puesto_carrera')
        .select('puesto_id')
        .eq('puesto_id', puestoPrivadoId)
      expect(carreras).toEqual([])

      const { data: forms } = await anonClient
        .from('formulario_preselector')
        .select('id')
        .eq('puesto_id', puestoPrivadoId)
      expect(forms ?? []).toEqual([])
    })

    it('anon ve la carrera del puesto público', async () => {
      const { data } = await anonClient
        .from('puesto_carrera')
        .select('puesto_id')
        .eq('puesto_id', puestoPublicoId)
      expect(data).toHaveLength(1)
    })
  })

  describe('puesto — postulante sin postulación', () => {
    it('no ve el puesto privado; sí el público', async () => {
      const { data } = await clientPostulante
        .from('puesto')
        .select('id')
        .in('id', [puestoPublicoId, puestoPrivadoId])
      expect(ids(data)).toEqual([puestoPublicoId])
    })

    it('no ve carrera, formulario, preguntas ni opciones del puesto privado', async () => {
      const { data: carreras } = await clientPostulante
        .from('puesto_carrera')
        .select('puesto_id')
        .eq('puesto_id', puestoPrivadoId)
      expect(carreras).toEqual([])

      const { data: forms } = await clientPostulante
        .from('formulario_preselector')
        .select('id')
        .eq('id', formularioPrivadoId)
      expect(forms).toEqual([])

      const { data: preguntas } = await clientPostulante
        .from('pregunta_preselector')
        .select('id')
        .eq('id', preguntaPrivadaId)
      expect(preguntas).toEqual([])

      const { data: opciones } = await clientPostulante
        .from('opcion_pregunta_preselector')
        .select('id')
        .eq('id', opcionPrivadaId)
      expect(opciones).toEqual([])
    })

    it('no ve ningún enlace', async () => {
      const { data } = await clientPostulante.from('puesto_enlace').select('token')
      expect(data).toEqual([])
    })
  })

  describe('puesto — postulante que ya se postuló (D6)', () => {
    it('ve el puesto privado al que se postuló, pero no otros privados', async () => {
      const { data } = await clientPostulado
        .from('puesto')
        .select('id')
        .in('id', [puestoPrivadoId, puestoAjenoPrivadoId])
      expect(ids(data)).toEqual([puestoPrivadoId])
    })

    it('ve carrera, formulario, preguntas y opciones de ese puesto', async () => {
      const { data: carreras } = await clientPostulado
        .from('puesto_carrera')
        .select('puesto_id')
        .eq('puesto_id', puestoPrivadoId)
      expect(carreras).toHaveLength(1)

      const { data: forms } = await clientPostulado
        .from('formulario_preselector')
        .select('id')
        .eq('id', formularioPrivadoId)
      expect(forms).toHaveLength(1)

      const { data: preguntas } = await clientPostulado
        .from('pregunta_preselector')
        .select('id')
        .eq('id', preguntaPrivadaId)
      expect(preguntas).toHaveLength(1)

      const { data: opciones } = await clientPostulado
        .from('opcion_pregunta_preselector')
        .select('id')
        .eq('id', opcionPrivadaId)
      expect(opciones).toHaveLength(1)
    })

    it('postularse no le da acceso al enlace', async () => {
      const { data } = await clientPostulado.from('puesto_enlace').select('token')
      expect(data).toEqual([])
    })
  })

  describe('postulacion y respuesta_preselector — INSERT solo del servidor (H13)', () => {
    async function perfilLibreId() {
      const { data } = await adminClient
        .from('perfil_postulante')
        .select('id')
        .eq('nombre_completo', 'post-libre-vis')
        .in('id', createdPerfilPostulanteIds)
        .single()
      if (!data) throw new Error('Sin perfil de postulante libre')
      return data.id
    }

    async function prepararHistorial(puestoId: string) {
      const historialId = crypto.randomUUID()
      createdHistorialIds.push(historialId)
      const { error } = await adminClient
        .from('historial_puesto')
        .insert({ id: historialId, puesto_id: puestoId })
      if (error) throw new Error(`Error insertando historial: ${error.message}`)
      return historialId
    }

    it.each([
      ['PRIVADA', () => puestoPrivadoId],
      ['PUBLICA', () => puestoPublicoId],
    ])('un postulante no puede insertar directo en postulacion de un puesto %s', async (_tipo, puesto) => {
      const puestoId = puesto()
      const postulanteId = await perfilLibreId()
      const historialId = await prepararHistorial(puestoId)
      const postulacionId = crypto.randomUUID()
      createdPostulacionIds.push(postulacionId)

      const { error } = await clientPostulante.from('postulacion').insert({
        id: postulacionId,
        puesto_id: puestoId,
        postulante_id: postulanteId,
        historial_puesto_id: historialId,
        estado: 'ENVIADA',
      })
      expect(error).not.toBeNull()
      expect(error?.code).toBe('42501')

      const { data } = await adminClient.from('postulacion').select('id').eq('id', postulacionId)
      expect(data).toEqual([])
    })

    it('un postulante no puede insertar directo en respuesta_preselector', async () => {
      // Postulacion legítima (creada por el servidor) del segundo postulante.
      const { data: existente } = await adminClient
        .from('postulacion')
        .select('id')
        .eq('id', createdPostulacionIds[0])
        .single()
      expect(existente).not.toBeNull()

      const { error } = await clientPostulado.from('respuesta_preselector').insert({
        postulacion_id: createdPostulacionIds[0],
        pregunta_id: preguntaPrivadaId,
        opcion_id: opcionPrivadaId,
      })
      expect(error).not.toBeNull()
      expect(error?.code).toBe('42501')

      const { data } = await adminClient
        .from('respuesta_preselector')
        .select('id')
        .eq('postulacion_id', createdPostulacionIds[0])
      expect(data).toEqual([])
    })
  })

  describe('puesto — reclutador dueño y admin', () => {
    it('el dueño ve todos sus puestos (público, privado y pausado)', async () => {
      const { data } = await clientOwner
        .from('puesto')
        .select('id')
        .in('id', [puestoPublicoId, puestoPrivadoId, puestoPausadoId])
      expect(ids(data).sort()).toEqual([puestoPublicoId, puestoPrivadoId, puestoPausadoId].sort())
    })

    it('el dueño ve las tablas hijas de su puesto privado', async () => {
      const { data: carreras } = await clientOwner
        .from('puesto_carrera')
        .select('puesto_id')
        .eq('puesto_id', puestoPrivadoId)
      expect(carreras).toHaveLength(1)

      const { data: forms } = await clientOwner
        .from('formulario_preselector')
        .select('id')
        .eq('id', formularioPrivadoId)
      expect(forms).toHaveLength(1)

      const { data: opciones } = await clientOwner
        .from('opcion_pregunta_preselector')
        .select('id')
        .eq('id', opcionPrivadaId)
      expect(opciones).toHaveLength(1)
    })

    it('otro reclutador NO ve el puesto privado ajeno ni sus hijos', async () => {
      const { data } = await clientOtroReclutador.from('puesto').select('id').eq('id', puestoPrivadoId)
      expect(data).toEqual([])

      const { data: forms } = await clientOtroReclutador
        .from('formulario_preselector')
        .select('id')
        .eq('id', formularioPrivadoId)
      expect(forms).toEqual([])
    })

    it('otro reclutador sigue viendo los puestos públicos ajenos', async () => {
      const { data } = await clientOtroReclutador.from('puesto').select('id').eq('id', puestoPublicoId)
      expect(ids(data)).toEqual([puestoPublicoId])
    })

    it('el admin ve todos los puestos, privados incluidos, y sus hijos', async () => {
      const { data } = await clientAdmin
        .from('puesto')
        .select('id')
        .in('id', [puestoPrivadoId, puestoAjenoPrivadoId, puestoPausadoId])
      expect(ids(data).sort()).toEqual([puestoPrivadoId, puestoAjenoPrivadoId, puestoPausadoId].sort())

      const { data: forms } = await clientAdmin
        .from('formulario_preselector')
        .select('id')
        .eq('id', formularioPrivadoId)
      expect(forms).toHaveLength(1)
    })
  })

  describe('puesto_enlace', () => {
    it('el dueño lee el enlace de sus puestos, y solo de los suyos', async () => {
      const { data, error } = await clientOwner
        .from('puesto_enlace')
        .select('puesto_id, token')
        .in('puesto_id', [puestoPrivadoId, puestoAjenoPrivadoId])
      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect(data?.[0].puesto_id).toBe(puestoPrivadoId)
      expect(data?.[0].token).toMatch(TOKEN_FORMATO)
    })

    it('otro reclutador no lee el enlace de un puesto ajeno', async () => {
      const { data } = await clientOtroReclutador
        .from('puesto_enlace')
        .select('token')
        .eq('puesto_id', puestoPrivadoId)
      expect(data).toEqual([])
    })

    it('el admin lee todos los enlaces', async () => {
      const { data } = await clientAdmin
        .from('puesto_enlace')
        .select('puesto_id')
        .in('puesto_id', [puestoPrivadoId, puestoAjenoPrivadoId])
      expect(data).toHaveLength(2)
    })

    it('el dueño no puede escribir en puesto_enlace (solo trigger y RPC)', async () => {
      const tokenOriginal = await tokenDe(puestoPublicoId)

      const { error: errUpdate } = await clientOwner
        .from('puesto_enlace')
        .update({ token: 'A'.repeat(32) })
        .eq('puesto_id', puestoPublicoId)
      expect(errUpdate).not.toBeNull()
      expect(errUpdate?.code).toBe('42501')

      const { error: errDelete } = await clientOwner
        .from('puesto_enlace')
        .delete()
        .eq('puesto_id', puestoPublicoId)
      expect(errDelete).not.toBeNull()
      expect(errDelete?.code).toBe('42501')

      const { error: errInsert } = await clientOwner
        .from('puesto_enlace')
        .insert({ puesto_id: puestoPublicoId, token: 'B'.repeat(32) })
      expect(errInsert).not.toBeNull()
      expect(errInsert?.code).toBe('42501')

      expect(await tokenDe(puestoPublicoId)).toBe(tokenOriginal)
    })
  })

  describe('regenerar_enlace_puesto (RPC)', () => {
    it('rechaza a un reclutador que no es dueño y no cambia el token', async () => {
      const antes = await tokenDe(puestoPrivadoId)

      const { data, error } = await clientOtroReclutador.rpc('regenerar_enlace_puesto', {
        p_puesto_id: puestoPrivadoId,
      })

      expect(data).toBeNull()
      expect(error).not.toBeNull()
      expect(error?.code).toBe('42501')
      expect(await tokenDe(puestoPrivadoId)).toBe(antes)
    })

    it('rechaza a un postulante', async () => {
      const antes = await tokenDe(puestoPrivadoId)
      const { error } = await clientPostulado.rpc('regenerar_enlace_puesto', {
        p_puesto_id: puestoPrivadoId,
      })
      expect(error?.code).toBe('42501')
      expect(await tokenDe(puestoPrivadoId)).toBe(antes)
    })

    it('rechaza a anon (sin EXECUTE)', async () => {
      const { error } = await anonClient.rpc('regenerar_enlace_puesto', { p_puesto_id: puestoPrivadoId })
      expect(error).not.toBeNull()
      expect(error?.code).toBe('42501')
    })

    it('el dueño obtiene un token nuevo y el anterior deja de existir', async () => {
      const antes = await tokenDe(puestoPublicoId)

      const { data: nuevo, error } = await clientOwner.rpc('regenerar_enlace_puesto', {
        p_puesto_id: puestoPublicoId,
      })

      expect(error).toBeNull()
      expect(nuevo).toMatch(TOKEN_FORMATO)
      expect(nuevo).not.toBe(antes)

      const { data: fila } = await adminClient
        .from('puesto_enlace')
        .select('token, regenerado_en')
        .eq('puesto_id', puestoPublicoId)
        .single()
      expect(fila?.token).toBe(nuevo)
      expect(fila?.regenerado_en).not.toBeNull()

      const { data: viejo } = await adminClient.from('puesto_enlace').select('puesto_id').eq('token', antes)
      expect(viejo).toEqual([])
    })
  })
})
