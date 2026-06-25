'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import { onboardingPostulanteSchema } from './schema'
import type { ActionResult } from '@/lib/types/domain'
import { calcularResultadoEneagrama, ErrorRespuestasIncompletas } from './calculator'

// ─── Onboarding: guardar datos básicos ───────────────────────────────────────
export async function guardarDatosBasicos(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await verifySession()

  const raw = {
    nombre_completo: formData.get('nombre_completo'),
    telefono: formData.get('telefono') || undefined,
    especificidad_puesto: formData.get('especificidad_puesto') || undefined,
    enlace_linkedin: formData.get('enlace_linkedin') || undefined,
    portfolio: formData.get('portfolio') || undefined,
  }

  const parsed = onboardingPostulanteSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      error: 'Revisá los campos del formulario.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const supabase = await createClient()

  // Verificar si ya existe perfil
  const { data: existente } = await supabase
    .from('perfil_postulante')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payload: any = {
    usuario_id: session.id,
    nombre_completo: parsed.data.nombre_completo,
    telefono: parsed.data.telefono || null,
    especificidad_puesto: parsed.data.especificidad_puesto || null,
    enlace_linkedin: parsed.data.enlace_linkedin || null,
    portfolio: parsed.data.portfolio || null,
  }

  let error
  if (existente) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (supabase.from('perfil_postulante') as any)
      .update(payload)
      .eq('id', (existente as { id: string }).id)
    error = result.error
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (supabase.from('perfil_postulante') as any).insert(payload)
    error = result.error
  }

  if (error) {
    return { success: false, error: 'No se pudieron guardar los datos. Intentá de nuevo.' }
  }

  revalidatePath('/postulante/onboarding')
  redirect('/postulante/eneagrama')
}

// ─── Iniciar/reiniciar test ───────────────────────────────────────────────────
export async function iniciarTest(perfilId: string): Promise<ActionResult<{ testId: string }>> {
  const session = await verifySession()
  const supabase = await createClient()
  const admin = createAdminClient()

  // Verificar que el perfilId pertenece al usuario actual
  const { data: perfil } = await supabase
    .from('perfil_postulante')
    .select('id')
    .eq('id', perfilId)
    .eq('usuario_id', session.id)
    .single()

  if (!perfil) return { success: false, error: 'Perfil no encontrado.' }

  // Verificar si ya existe un test
  const { data: testExistente } = await supabase
    .from('test_eneagrama')
    .select('id')
    .eq('postulante_id', perfilId)
    .single()

  if (testExistente) {
    const testId = (testExistente as { id: string }).id

    // Reiniciar: borrar respuestas, puntajes y dominantes anteriores
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('respuesta_item_eneagrama') as any)
      .delete()
      .eq('test_eneagrama_id', testId)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('resultado_puntaje_eneagrama') as any)
      .delete()
      .eq('test_eneagrama_id', testId)

    // ON DELETE CASCADE se encarga si borráramos el test, pero como lo reutilizamos
    // borramos los dominantes manualmente.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('test_eneagrama_dominante') as any)
      .delete()
      .eq('test_eneagrama_id', testId)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('test_eneagrama') as any)
      .update({
        ala: null,
        tiene_empate_dominante: false,
        dominantes_empate: null,
        tiene_empate_ala: false,
        fecha_realizacion: new Date().toISOString(),
      })
      .eq('id', testId)

    return { success: true, data: { testId } }
  }

  // Crear nuevo test
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: nuevoTest, error } = await (admin.from('test_eneagrama') as any)
    .insert({ postulante_id: perfilId })
    .select('id')
    .single()

  if (error || !nuevoTest) {
    return { success: false, error: 'No se pudo crear el test.' }
  }

  return { success: true, data: { testId: (nuevoTest as { id: string }).id } }
}

// ─── Guardar respuesta individual ────────────────────────────────────────────
export async function guardarRespuesta(
  testId: string,
  preguntaId: string,
  valorRespondido: number
): Promise<ActionResult> {
  const session = await verifySession()
  const supabase = await createClient()

  // Verificar que el test pertenece al usuario
  const { data: test } = await supabase
    .from('test_eneagrama')
    .select('id, postulante_id')
    .eq('id', testId)
    .single()

  if (!test) return { success: false, error: 'Test no encontrado.' }

  const testTyped = test as { id: string; postulante_id: string }

  // Verificar ownership via perfil_postulante
  const { data: perfil } = await supabase
    .from('perfil_postulante')
    .select('id')
    .eq('id', testTyped.postulante_id)
    .eq('usuario_id', session.id)
    .single()

  if (!perfil) return { success: false, error: 'Acceso denegado.' }

  // Upsert de la respuesta
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from('respuesta_item_eneagrama') as any).upsert(
    {
      test_eneagrama_id: testId,
      pregunta_id: preguntaId,
      valor_respondido: valorRespondido,
    },
    { onConflict: 'test_eneagrama_id,pregunta_id' }
  )

  if (error) return { success: false, error: 'No se pudo guardar la respuesta.' }
  return { success: true, data: undefined }
}

// ─── Calcular eneatipo ────────────────────────────────────────────────────────
export async function calcularEneatipo(testId: string): Promise<ActionResult<{ eneatipoNumero: number; eneatipoNombre: string }>> {
  const session = await verifySession()
  const supabase = await createClient()
  const admin = createAdminClient()

  // Verificar ownership
  const { data: test } = await supabase
    .from('test_eneagrama')
    .select('id, postulante_id')
    .eq('id', testId)
    .single()

  if (!test) return { success: false, error: 'Test no encontrado.' }

  const testTyped = test as { id: string; postulante_id: string }

  const { data: perfil } = await supabase
    .from('perfil_postulante')
    .select('id')
    .eq('id', testTyped.postulante_id)
    .eq('usuario_id', session.id)
    .single()

  if (!perfil) return { success: false, error: 'Acceso denegado.' }

  // Cargar preguntas activas para validar completitud
  const { data: preguntasActivas, error: errPreguntas } = await supabase
    .from('pregunta_eneagrama')
    .select('id, eneatipo_asociado')
    .eq('pausada', false)
    .is('fecha_baja', null)

  if (errPreguntas || !preguntasActivas) {
    return { success: false, error: 'No se pudieron cargar las preguntas del test.' }
  }

  // Cargar respuestas del candidato
  const { data: respuestasDb } = await supabase
    .from('respuesta_item_eneagrama')
    .select('pregunta_id, valor_respondido, pregunta_eneagrama(eneatipo_asociado)')
    .eq('test_eneagrama_id', testId)

  if (!respuestasDb) {
    return { success: false, error: 'No se pudieron cargar las respuestas.' }
  }

  const respuestasInput = respuestasDb.flatMap(r => {
    const row = r as {
      pregunta_id: string
      valor_respondido: number
      pregunta_eneagrama: { eneatipo_asociado: number } | null
    }
    const tipo = row.pregunta_eneagrama?.eneatipo_asociado
    if (!tipo || tipo < 1 || tipo > 9) return []
    return [{
      preguntaId: row.pregunta_id,
      eneatipoAsociado: tipo as import('./calculator').NumeroEneatipo,
      valorRespondido: row.valor_respondido as 1 | 2 | 3 | 4 | 5,
    }]
  })

  const preguntasEsperadasIds = new Set(preguntasActivas.map(p => (p as { id: string }).id))
  let resultado: import('./calculator').ResultadoCalculo
  try {
    resultado = calcularResultadoEneagrama(respuestasInput, preguntasEsperadasIds)
  } catch (e) {
    if (e instanceof ErrorRespuestasIncompletas) {
      return {
        success: false,
        error: `El test no está completo. Faltan ${e.faltantes.length} respuesta(s).`,
      }
    }
    return { success: false, error: 'Error al calcular el resultado.' }
  }

  // Obtener UUID + datos para CADA dominante
  const dominantesConDatos = await Promise.all(
    resultado.dominantes.map(async (num) => {
      const { data } = await supabase
        .from('eneatipo')
        .select('id, nombre')
        .eq('numero_eneatipo', num)
        .single()
      if (!data) return null
      const row = data as { id: string; nombre: string }
      const puntaje = resultado.puntajes.find(p => p.eneatipo === num)!
      return { id: row.id, nombre: row.nombre, numero: num, puntajeCrudo: puntaje.puntajeCrudo, porcentaje: puntaje.porcentaje }
    })
  )

  if (dominantesConDatos.some(d => d === null)) {
    return { success: false, error: 'Error al obtener los eneatipos dominantes.' }
  }

  const dominantesValidos = dominantesConDatos.filter(
    (d): d is NonNullable<typeof d> => d !== null
  )

  // Actualizar test_eneagrama (ya sin eneatipo_id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from('test_eneagrama') as any)
    .update({
      ala: resultado.ala,
      tiene_empate_dominante: resultado.tieneEmpateDominante,
      dominantes_empate: resultado.tieneEmpateDominante ? resultado.dominantes : null,
      tiene_empate_ala: resultado.tieneEmpateAla,
    })
    .eq('id', testId)

  // Borrar dominantes anteriores e insertar los nuevos
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from('test_eneagrama_dominante') as any)
    .delete()
    .eq('test_eneagrama_id', testId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from('test_eneagrama_dominante') as any)
    .insert(dominantesValidos.map(d => ({
      test_eneagrama_id: testId,
      eneatipo_id: d.id,
      puntaje_crudo: d.puntajeCrudo,
      porcentaje: d.porcentaje,
    })))

  // Persistir los 9 puntajes en resultado_puntaje_eneagrama
  const filasPuntaje = resultado.puntajes.map(p => ({
    test_eneagrama_id: testId,
    eneatipo_numero: p.eneatipo,
    puntaje_crudo: p.puntajeCrudo,
    porcentaje: p.porcentaje,
  }))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from('resultado_puntaje_eneagrama') as any)
    .upsert(filasPuntaje, { onConflict: 'test_eneagrama_id,eneatipo_numero' })

  // Crear/reiniciar informe_personalidad en PENDIENTE
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: informeExistente } = await (supabase.from('informe_personalidad') as any)
    .select('id')
    .eq('postulante_id', testTyped.postulante_id)
    .single()

  if (!informeExistente) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('informe_personalidad') as any).insert({
      postulante_id: testTyped.postulante_id,
      estado_informe: 'PENDIENTE',
    })
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('informe_personalidad') as any)
      .update({ estado_informe: 'PENDIENTE', contenido_informe: null })
      .eq('id', (informeExistente as { id: string }).id)
  }

  revalidatePath('/postulante')
  revalidatePath('/postulante/eneagrama')

  const primero = dominantesValidos[0]
  return { success: true, data: { eneatipoNumero: primero.numero, eneatipoNombre: primero.nombre } }
}
