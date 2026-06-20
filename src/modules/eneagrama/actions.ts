'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import { onboardingPostulanteSchema } from './schema'
import type { ActionResult } from '@/lib/types/domain'

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
    // Reiniciar: borrar respuestas y resetear eneatipo
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('respuesta_item_eneagrama') as any)
      .delete()
      .eq('test_eneagrama_id', (testExistente as { id: string }).id)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('test_eneagrama') as any)
      .update({ eneatipo_id: null, fecha_realizacion: new Date().toISOString() })
      .eq('id', (testExistente as { id: string }).id)

    return { success: true, data: { testId: (testExistente as { id: string }).id } }
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
export async function calcularEneatipo(testId: string): Promise<ActionResult<{ eneatipoNumero: number }>> {
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

  // Cargar respuestas + eneatipo_asociado de cada pregunta
  const { data: respuestas } = await supabase
    .from('respuesta_item_eneagrama')
    .select('valor_respondido, pregunta_eneagrama(eneatipo_asociado)')
    .eq('test_eneagrama_id', testId)

  if (!respuestas || respuestas.length < 135) {
    return { success: false, error: 'El test no está completo. Respondé todas las preguntas.' }
  }

  // Calcular puntajes por tipo (1–9)
  const puntajes: Record<number, number> = {}
  for (let i = 1; i <= 9; i++) puntajes[i] = 0

  for (const r of respuestas) {
    const resp = r as { valor_respondido: number; pregunta_eneagrama: { eneatipo_asociado: number } | null }
    const tipo = resp.pregunta_eneagrama?.eneatipo_asociado
    if (tipo && tipo >= 1 && tipo <= 9) {
      puntajes[tipo] += resp.valor_respondido
    }
  }

  // Encontrar el mayor puntaje; en empate, elegir el número menor
  // Decisión: empate → tipo menor (documentado para revisión futura con la propietaria)
  let maxPuntaje = 0
  let eneatipoGanador = 1
  for (let i = 1; i <= 9; i++) {
    if (puntajes[i] > maxPuntaje) {
      maxPuntaje = puntajes[i]
      eneatipoGanador = i
    }
  }

  // Obtener el UUID del eneatipo ganador
  const { data: eneatipo } = await supabase
    .from('eneatipo')
    .select('id')
    .eq('numero_eneatipo', eneatipoGanador)
    .single()

  if (!eneatipo) return { success: false, error: 'Error al obtener el eneatipo.' }

  const eneatipoTyped = eneatipo as { id: string }

  // Guardar resultado en el test
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from('test_eneagrama') as any)
    .update({ eneatipo_id: eneatipoTyped.id })
    .eq('id', testId)

  // Crear informe_personalidad en PENDIENTE (la generación LLM es Fase 4)
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
    // Reiniciar informe existente a PENDIENTE (porque el test cambió)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('informe_personalidad') as any)
      .update({ estado_informe: 'PENDIENTE', contenido_informe: null })
      .eq('id', (informeExistente as { id: string }).id)
  }

  revalidatePath('/postulante')
  revalidatePath('/postulante/eneagrama')

  return { success: true, data: { eneatipoNumero: eneatipoGanador } }
}
