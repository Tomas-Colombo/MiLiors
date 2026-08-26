'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import type { TablesInsert } from '@/lib/types/database.types'
import { onboardingPostulanteSchema } from './schema'
import type { ActionResult } from '@/lib/types/domain'
import { calcularResultadoEneagrama, ErrorRespuestasIncompletas } from './calculator'
import { validarCalidadTest } from './quality-validator'
import { evaluarRehacer, formatearFecha } from './rehacer-policy'
import { generarInforme } from '@/modules/informe/actions'

/**
 * Todo perfil nuevo arranca con Español como idioma nativo: es el idioma del
 * mercado al que apunta la plataforma. Queda como un idioma más del perfil
 * técnico, así que el postulante puede editarlo o eliminarlo.
 * Errores no fatales: el onboarding no debe fallar por esto.
 */
async function sembrarIdiomaEspanol(postulanteId: string): Promise<void> {
  const admin = createAdminClient()

  const { data: perfilTecnico, error } = await admin.from('perfil_tecnico')
    .insert({ postulante_id: postulanteId })
    .select('id')
    .single()

  if (error || !perfilTecnico) {
    console.error('[onboarding] No se pudo crear el perfil técnico inicial:', error)
    return
  }

  const { error: errorIdioma } = await admin.from('idioma').insert({
    perfil_tecnico_id: (perfilTecnico as { id: string }).id,
    nombre: 'Español',
    nivel_idioma: 'NATIVO',
  })

  if (errorIdioma) {
    console.error('[onboarding] No se pudo agregar el idioma español por defecto:', errorIdioma)
  }
}

// ─── Onboarding: guardar datos básicos ───────────────────────────────────────
export async function guardarDatosBasicos(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await verifySession()

  const raw = {
    nombre_completo: formData.get('nombre_completo'),
    provincia_id: formData.get('provincia_id') || '',
    localidad_id: formData.get('localidad_id') || '',
    telefono: formData.get('telefono') || undefined,
    carrera_id: formData.get('carrera_id') || undefined,
    carrera_otra: formData.get('carrera_otra') || undefined,
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

  const payload: TablesInsert<'perfil_postulante'> = {
    usuario_id: session.id,
    nombre_completo: parsed.data.nombre_completo,
    // La localidad es opcional; si vino, el trigger de la base recalcula
    // provincia_id a partir de ella y descarta lo que mande el formulario.
    provincia_id: parsed.data.provincia_id,
    localidad_id: parsed.data.localidad_id || null,
    telefono: parsed.data.telefono || null,
    carrera_id: parsed.data.carrera_id || null,
    carrera_otra: parsed.data.carrera_otra || null,
    enlace_linkedin: parsed.data.enlace_linkedin || null,
    portfolio: parsed.data.portfolio || null,
  }

  let error
  if (existente) {
    const result = await supabase.from('perfil_postulante')
      .update(payload)
      .eq('id', (existente as { id: string }).id)
    error = result.error
  } else {
    // Al crear el perfil por primera vez, el postulante queda visible para los
    // reclutadores por defecto. Si no lo desea, puede desactivar la visibilidad
    // desde su perfil. En la actualización nunca se toca este flag para respetar
    // la elección previa del postulante.
    const result = await supabase.from('perfil_postulante')
      .insert({
        ...payload,
        perfil_en_busqueda: true,
      })
      .select('id')
      .single()
    error = result.error

    if (!error && result.data) {
      await sembrarIdiomaEspanol((result.data as { id: string }).id)
    }
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
    .select('id, veces_completado, fecha_realizacion')
    .eq('postulante_id', perfilId)
    .single()

  if (testExistente) {
    const testTyped = testExistente as {
      id: string
      veces_completado: number | null
      fecha_realizacion: string | null
    }
    const testId = testTyped.id

    // Regla de espera entre repeticiones. Se valida en el servidor antes de
    // borrar nada: el bloqueo de la UI es sólo una ayuda visual.
    const estado = evaluarRehacer(testTyped.veces_completado ?? 0, testTyped.fecha_realizacion)
    if (!estado.puedeRehacer && estado.disponibleDesde) {
      return {
        success: false,
        error: `Vas a poder rehacer el Eneagrama a partir del ${formatearFecha(estado.disponibleDesde)}.`,
      }
    }

    // Reiniciar respuestas para permitir un nuevo intento. El resultado anterior
    // (dominantes, puntajes, ala, fecha_realizacion) se conserva intacto hasta que
    // calcularEneatipo() valide y persista un resultado nuevo y válido. Así, si el
    // nuevo intento falla (incompleto o inválido por calidad), el postulante sigue
    // teniendo su resultado previo vigente y el resto de la app (navegación entre
    // módulos, certificado, informe) no se rompe.
    await admin.from('respuesta_item_eneagrama')
      .delete()
      .eq('test_eneagrama_id', testId)

    return { success: true, data: { testId } }
  }

  // Crear nuevo test
  const { data: nuevoTest, error } = await admin.from('test_eneagrama')
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
  const { error } = await supabase.from('respuesta_item_eneagrama').upsert(
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
    .select('id, postulante_id, veces_completado')
    .eq('id', testId)
    .single()

  if (!test) return { success: false, error: 'Test no encontrado.' }

  const testTyped = test as { id: string; postulante_id: string; veces_completado: number | null }

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

  // Validar calidad estadística de las respuestas ANTES de persistir.
  // Un test con patrón de respuesta inválido (plano/uniforme o empate excesivo)
  // no se guarda como resultado válido: no genera certificado ni alimenta el informe.
  const valoresRespuesta = respuestasInput.map(r => r.valorRespondido)
  const validacion = validarCalidadTest(valoresRespuesta, resultado.dominantes)
  if (!validacion.valido) {
    console.warn(`[eneagrama] Test ${testId} inválido por: ${validacion.motivo}`)
    return { success: false, error: 'TEST_INVALIDO' }
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

  // Actualizar test_eneagrama (ya sin eneatipo_id). Recién acá, con el resultado
  // ya validado, se sobrescribe el intento anterior — nunca antes de validar.
  await admin.from('test_eneagrama')
    .update({
      ala: resultado.ala,
      tiene_empate_dominante: resultado.tieneEmpateDominante,
      dominantes_empate: resultado.tieneEmpateDominante ? resultado.dominantes : null,
      tiene_empate_ala: resultado.tieneEmpateAla,
      fecha_realizacion: new Date().toISOString(),
      // Sólo cuentan las realizaciones con resultado válido: un intento
      // descartado por calidad no consume la espera de 6 meses.
      veces_completado: (testTyped.veces_completado ?? 0) + 1,
    })
    .eq('id', testId)

  // Borrar dominantes anteriores e insertar los nuevos
  await admin.from('test_eneagrama_dominante')
    .delete()
    .eq('test_eneagrama_id', testId)

  await admin.from('test_eneagrama_dominante')
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
  await admin.from('resultado_puntaje_eneagrama')
    .upsert(filasPuntaje, { onConflict: 'test_eneagrama_id,eneatipo_numero' })

  // Informe de personalidad: la primera vez se genera automáticamente; al REHACER
  // el test (ya había un informe LISTO) solo se marca DESACTUALIZADO — el postulante
  // lo regenera manualmente desde /postulante/informe (ahorra créditos de IA).
  const { data: informeExistente } = await supabase
    .from('informe_personalidad')
    .select('id, estado_informe, contenido_json')
    .eq('postulante_id', testTyped.postulante_id)
    .single()

  const infPrev = informeExistente as { id: string; estado_informe: string; contenido_json: unknown } | null
  // "Ya generado" en el FORMATO NUEVO: exige contenido_json. Un informe LISTO
  // heredado del formato viejo (sin contenido_json) debe regenerarse, no solo
  // marcarse desactualizado (si no, el visor no tiene nada que mostrar).
  const yaGenerado = !!infPrev && infPrev.estado_informe === 'LISTO' && infPrev.contenido_json != null

  if (yaGenerado) {
    // Rehacer test → informe y certificado quedan desactualizados (sin regenerar).
    await admin.from('informe_personalidad')
      .update({ desactualizado: true })
      .eq('id', infPrev!.id)
    await admin.from('certificado_pdf')
      .update({ desactualizado: true })
      .eq('postulante_id', testTyped.postulante_id)
  } else {
    // Primera vez (o generación previa fallida): asegurar registro y auto-generar.
    if (!infPrev) {
      await admin.from('informe_personalidad').insert({
        postulante_id: testTyped.postulante_id,
        estado_informe: 'PENDIENTE',
      })
    }
    // Auto-generación inicial. Errores no-fatales — se reintenta desde la sección.
    try {
      await generarInforme()
    } catch (e) {
      console.error('[eneagrama] Error auto-generando informe:', e)
    }
  }

  revalidatePath('/postulante')
  revalidatePath('/postulante/eneagrama')
  revalidatePath('/postulante/human-design')

  const primero = dominantesValidos[0]
  return { success: true, data: { eneatipoNumero: primero.numero, eneatipoNombre: primero.nombre } }
}
