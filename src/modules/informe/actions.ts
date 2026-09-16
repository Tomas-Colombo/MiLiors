'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server-admin'
import { verifySession } from '@/lib/dal'
import { z } from 'zod'
import { generarInformePersonalidad, type InformeContext } from './service'
import { competenciaKeyPorNombre } from './competencias'
import { getConfiguracionSistema } from '@/modules/configuracion/queries'
import type { ActionResult } from '@/lib/types/domain'
import { esFormatoAnterior, type InformePersonalidadJSON } from '@/lib/types/informe'

async function recopilarContexto(postulanteId: string): Promise<InformeContext | null> {
  const session = await verifySession()
  const supabase = await createClient()

  // Perfil básico
  const { data: perfil } = await supabase
    .from('perfil_postulante')
    .select('nombre_completo, carrera_otra, carrera:carrera_id(nombre)')
    .eq('id', postulanteId)
    .eq('usuario_id', session.id)
    .single()

  if (!perfil) return null
  const perfilTyped = perfil as {
    nombre_completo: string
    carrera_otra: string | null
    carrera: { nombre: string } | null
  }

  // Test de Eneagrama vigente
  const { data: test } = await supabase
    .from('test_eneagrama')
    .select('id')
    .eq('postulante_id', postulanteId)
    .single()

  if (!test) return null
  const testId = (test as { id: string }).id

  // Los 9 scores (porcentaje por eneatipo)
  const { data: puntajes } = await supabase
    .from('resultado_puntaje_eneagrama')
    .select('eneatipo_numero, porcentaje')
    .eq('test_eneagrama_id', testId)

  const filas = (puntajes ?? []) as { eneatipo_numero: number; porcentaje: number }[]
  if (filas.length === 0) return null

  const scores: Record<number, number> = {}
  for (const f of filas) scores[f.eneatipo_numero] = Number(f.porcentaje)

  // Human Design (opcional)
  const { data: hd } = await supabase
    .from('human_design')
    .select('tipo_energetico, autoridad_hd, perfil_hd, estrategia_hd')
    .eq('postulante_id', postulanteId)
    .single()

  return {
    nombre: perfilTyped.nombre_completo,
    especificidadPuesto: perfilTyped.carrera?.nombre ?? perfilTyped.carrera_otra ?? null,
    scores,
    humanDesign: hd
      ? (hd as { tipo_energetico: string; autoridad_hd: string; perfil_hd: string; estrategia_hd: string })
      : null,
  }
}

/**
 * Genera (o regenera) el informe de personalidad del postulante.
 *
 * Se usa desde:
 *   - Completar el Eneagrama inicial (automático, vía módulo eneagrama).
 *   - Botón "Actualizar" en la sección (manual) — solo si está desactualizado.
 *   - Botón "Reintentar" (manual) cuando quedó en ERROR.
 *
 * REGLA: si ya existe un informe LISTO y NO está desactualizado, no se regenera
 * (evita gastar créditos de IA sin necesidad).
 */
// ─── FEEDBACK DEL POSTULANTE ──────────────────────────────────────────────────
// Telemetría para calibrar el motor. NO toca el informe: lo consume la síntesis
// del certificado firmado, y un informe autocorregible dejaría de ser evidencia.

/** Informe vigente del usuario autenticado, o null. */
async function getInformeVigente(): Promise<{
  id: string
  postulanteId: string
  fechaGeneracion: string
  contenido: InformePersonalidadJSON
} | null> {
  const session = await verifySession()
  const supabase = await createClient()

  const { data: postulante } = await supabase
    .from('perfil_postulante')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!postulante) return null
  const postulanteId = (postulante as { id: string }).id

  const { data } = await supabase
    .from('informe_personalidad')
    .select('id, fecha_generacion, contenido_json, estado_informe')
    .eq('postulante_id', postulanteId)
    .single()

  const informe = data as {
    id: string
    fecha_generacion: string
    contenido_json: InformePersonalidadJSON | null
    estado_informe: string
  } | null

  if (!informe || informe.estado_informe !== 'LISTO' || !informe.contenido_json) return null

  return {
    id: informe.id,
    postulanteId,
    fechaGeneracion: informe.fecha_generacion,
    contenido: informe.contenido_json,
  }
}

const valoracionSchema = z.enum(['SUBESTIMA', 'JUSTO', 'SOBRESTIMA'])

/**
 * Registra cómo le cae al postulante el nivel calculado para UNA competencia.
 *
 * El cliente manda sólo el nombre y la valoración: el nivel mostrado se deriva
 * acá del informe persistido. Que el navegador declare qué nivel vio abriría la
 * puerta a ensuciar el agregado que después usamos para mover los pesos.
 */
export async function valorarCompetencia(
  nombre: string,
  valoracion: string,
): Promise<ActionResult> {
  const parsed = valoracionSchema.safeParse(valoracion)
  if (!parsed.success) return { success: false, error: 'Valoración inválida.' }

  const informe = await getInformeVigente()
  if (!informe) return { success: false, error: 'No tenés un informe generado.' }

  const competencia = informe.contenido.competencias.find(c => c.nombre === nombre)
  const key = competenciaKeyPorNombre(nombre)
  if (!competencia || !key) return { success: false, error: 'Competencia no encontrada en tu informe.' }

  const supabase = await createClient()
  const { error } = await supabase.from('feedback_informe_competencia').upsert(
    {
      informe_id: informe.id,
      postulante_id: informe.postulanteId,
      competencia_key: key,
      nivel_mostrado: competencia.nivel,
      valoracion: parsed.data,
      informe_generado_at: informe.fechaGeneracion,
    },
    { onConflict: 'informe_id,competencia_key' },
  )

  if (error) return { success: false, error: 'No se pudo guardar tu respuesta.' }
  revalidatePath('/postulante/informe')
  return { success: true, data: undefined }
}

const feedbackGlobalSchema = z.object({
  // Porcentaje en 10 niveles: 10, 20, … 100.
  representatividad: z.coerce
    .number()
    .int()
    .min(10, { message: 'Elegí un porcentaje.' })
    .max(100, { message: 'Elegí un porcentaje.' })
    .refine(n => n % 10 === 0, { message: 'Elegí un porcentaje.' }),
  comentario: z.string().trim().max(2000, { message: 'Máximo 2000 caracteres.' }).optional(),
})

/** Pregunta global de cierre: qué tan representado se siente + texto libre. */
export async function guardarFeedbackInforme(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = feedbackGlobalSchema.safeParse({
    representatividad: formData.get('representatividad'),
    comentario: formData.get('comentario') || undefined,
  })
  if (!parsed.success) {
    return {
      success: false,
      error: 'Revisá los campos.',
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    }
  }

  const informe = await getInformeVigente()
  if (!informe) return { success: false, error: 'No tenés un informe generado.' }

  const supabase = await createClient()

  // El cuadro cerrado es UI; el período de reactivación se hace valer también
  // acá, porque el formulario se puede reenviar sin pasar por la pantalla.
  const { data: previa } = await supabase
    .from('feedback_informe')
    .select('informe_generado_at, updated_at')
    .eq('informe_id', informe.id)
    .maybeSingle()

  const previaTyped = previa as { informe_generado_at: string; updated_at: string } | null

  // Una respuesta anterior a la última regeneración no cuenta: el informe cambió.
  if (previaTyped && previaTyped.informe_generado_at >= informe.fechaGeneracion) {
    const { diasReactivarFeedback } = await getConfiguracionSistema()
    const reabre =
      new Date(previaTyped.updated_at).getTime() + diasReactivarFeedback * 24 * 60 * 60 * 1000
    if (reabre > Date.now()) {
      return { success: false, error: 'Ya dejaste tu opinión sobre este informe.' }
    }
  }

  const { error } = await supabase.from('feedback_informe').upsert(
    {
      informe_id: informe.id,
      postulante_id: informe.postulanteId,
      representatividad: parsed.data.representatividad,
      comentario: parsed.data.comentario || null,
      informe_generado_at: informe.fechaGeneracion,
    },
    { onConflict: 'informe_id' },
  )

  if (error) return { success: false, error: 'No se pudo guardar tu respuesta.' }
  revalidatePath('/postulante/informe')
  return { success: true, data: undefined }
}

export async function generarInforme(): Promise<ActionResult> {
  const session = await verifySession()
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: postulante } = await supabase
    .from('perfil_postulante')
    .select('id')
    .eq('usuario_id', session.id)
    .single()

  if (!postulante) return { success: false, error: 'Perfil no encontrado.' }
  const postulanteId = (postulante as { id: string }).id

  const { data: informeExistente } = await supabase
    .from('informe_personalidad')
    .select('id, estado_informe, contenido_json, desactualizado')
    .eq('postulante_id', postulanteId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  const prev = informeExistente as {
    id: string
    estado_informe: string
    contenido_json: unknown
    desactualizado: boolean
  } | null

  const teniaInformeValido = !!prev && prev.estado_informe === 'LISTO' && prev.contenido_json != null

  // Un informe de un esquema anterior cuenta como pendiente de actualizar,
  // aunque el Eneagrama no haya cambiado: es la única forma de que el botón de
  // "formato anterior" pueda hacer algo.
  const formatoAnterior = esFormatoAnterior(prev?.contenido_json as InformePersonalidadJSON | null)

  // Bloqueo: no permitir actualizar un informe que ya está al día.
  if (teniaInformeValido && !prev!.desactualizado && !formatoAnterior) {
    return { success: false, error: 'El informe ya está actualizado.' }
  }

  let informeId: string
  if (prev) {
    informeId = prev.id
    // Marcamos PENDIENTE sin borrar el contenido: si la generación falla,
    // el informe anterior sigue intacto (ver fallarGeneracion).
    await admin.from('informe_personalidad')
      .update({ estado_informe: 'PENDIENTE' })
      .eq('id', informeId)
  } else {
    const { data: nuevo } = await admin.from('informe_personalidad')
      .insert({ postulante_id: postulanteId, estado_informe: 'PENDIENTE' })
      .select('id')
      .single()
    if (!nuevo) return { success: false, error: 'No se pudo crear el registro del informe.' }
    informeId = (nuevo as { id: string }).id
  }

  async function fallarGeneracion(mensaje: string): Promise<ActionResult> {
    await admin.from('informe_personalidad')
      .update({ estado_informe: teniaInformeValido ? 'LISTO' : 'ERROR' })
      .eq('id', informeId)
    revalidatePath('/postulante/informe')
    revalidatePath('/postulante')
    return {
      success: false,
      error: teniaInformeValido
        ? `No se pudo regenerar el informe: ${mensaje} Se conservó tu informe anterior.`
        : mensaje,
    }
  }

  const ctx = await recopilarContexto(postulanteId)
  if (!ctx) {
    return fallarGeneracion('Datos insuficientes para generar el informe. Completá el Eneagrama.')
  }

  const resultado = await generarInformePersonalidad(ctx)
  if (!resultado.ok) {
    // `motivo` ya es una frase cerrada y en castellano, y `fallarGeneracion`
    // le pone su propio encabezado: envolverlo acá duplicaba el prefijo
    // ("No se pudo regenerar el informe: No se pudo generar el informe: ...").
    return fallarGeneracion(resultado.motivo)
  }

  const { error: saveError } = await admin.from('informe_personalidad')
    .update({
      estado_informe: 'LISTO',
      contenido_json: resultado.contenido_json,
      contenido_informe: null,
      fecha_generacion: new Date().toISOString(),
      desactualizado: false,
    })
    .eq('id', informeId)

  if (saveError) {
    console.error('[informe/actions] Error al guardar informe LISTO:', saveError)
    return fallarGeneracion('El informe se generó pero no se pudo guardar. Intentá de nuevo.')
  }

  // El certificado imprime contenido del informe —las competencias destacadas y,
  // sin síntesis, el párrafo de personalidad (ver `pdf-props`)— y lo lee vivo en
  // cada descarga. Un informe nuevo cambia entonces un documento que ya se firmó
  // con otra fecha y que declara no haber sido alterado: hay que re-emitirlo.
  //
  // Casi siempre el Eneagrama ya lo marcó (rehacer el test es lo que habilita
  // regenerar). La vía que no pasa por ahí es el botón de "formato anterior",
  // que regenera con el test intacto y dejaba el certificado en "Verificado".
  const { error: marcarCertError } = await admin.from('certificado_pdf')
    .update({ desactualizado: true })
    .eq('postulante_id', postulanteId)

  if (marcarCertError) {
    // No es fatal: el informe ya se guardó bien. Pero sin esto el postulante
    // sigue postulándose con un certificado alterado, así que queda en el log.
    console.error(
      '[informe/actions] No se pudo marcar el certificado como desactualizado:',
      marcarCertError.message,
    )
  }

  revalidatePath('/postulante/informe')
  revalidatePath('/postulante')
  revalidatePath('/postulante/certificado')
  return { success: true, data: undefined }
}
