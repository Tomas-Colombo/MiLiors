import 'server-only'
import type { createClient } from '@/lib/supabase/server'
import type { createAdminClient } from '@/lib/supabase/server-admin'
import type { InformePersonalidadJSON } from '@/lib/types/informe'
import { calcularMotorV2 } from '@/modules/informe/competencias'
import { construirBloquePersonalidad } from './personalidad'
import type { CandidatoContexto } from './prompts'

/** Máximo de notas privadas por candidato que se mandan al modelo. */
const MAX_NOTAS = 10

/**
 * Carga el contexto completo de un candidato para un puesto: perfil técnico,
 * bloque de personalidad (motor V2 + narrativa) y notas privadas del reclutador.
 *
 * La usan el informe de selección grupal y el asistente 1-a-1: los dos ven
 * exactamente el mismo candidato. Lanza si falta el perfil o falla la consulta
 * del informe — un análisis armado con datos silenciosamente incompletos sería
 * engañoso.
 */
export async function cargarContextoCandidato(
  admin: ReturnType<typeof createAdminClient>,
  supabase: Awaited<ReturnType<typeof createClient>>,
  reclutadorId: string,
  puestoId: string,
  postulanteId: string
): Promise<CandidatoContexto> {
  const [
    { data: postulanteRaw, error: postulanteError },
    { data: ptRaw },
    { data: informeRaw, error: informeError },
    notasRes,
  ] =
    await Promise.all([
      admin
        .from('perfil_postulante')
        .select(
          'nombre_completo, test_eneagrama(resultado_puntaje_eneagrama(eneatipo_numero, porcentaje), test_eneagrama_dominante(eneatipo(numero_eneatipo, nombre)))'
        )
        .eq('id', postulanteId)
        .single(),
      admin.from('perfil_tecnico').select('id').eq('postulante_id', postulanteId).maybeSingle(),
      admin
        .from('informe_personalidad')
        .select('contenido_json, desactualizado')
        .eq('postulante_id', postulanteId)
        .eq('estado_informe', 'LISTO')
        .maybeSingle(),
      // Notas relevantes al puesto: las de este puesto + las generales (sin puesto)
      supabase
        .from('nota_privada')
        .select('contenido, puesto_id')
        .eq('reclutador_id', reclutadorId)
        .eq('postulante_id', postulanteId)
        .order('updated_at', { ascending: false })
        .limit(20),
    ])

  if (postulanteError || !postulanteRaw) {
    throw new Error(
      `perfil_postulante ${postulanteId}: ${postulanteError?.message ?? 'no se encontró el perfil'}`
    )
  }
  if (informeError) {
    throw new Error(`informe_personalidad ${postulanteId}: ${informeError.message}`)
  }

  const postulanteTyped = postulanteRaw as {
    nombre_completo: string
    test_eneagrama: {
      resultado_puntaje_eneagrama: { eneatipo_numero: number; porcentaje: number | string }[]
      test_eneagrama_dominante: { eneatipo: { numero_eneatipo: number; nombre: string } }[]
    } | null
  }

  // Los 9 porcentajes por eneatipo alimentan el motor determinístico. No dependen
  // del informe: un candidato sin informe LISTO igual se evalúa por el motor.
  const filasPuntaje = postulanteTyped.test_eneagrama?.resultado_puntaje_eneagrama ?? []
  let scores: Record<number, number> | null = null
  if (filasPuntaje.length > 0) {
    scores = {}
    for (const f of filasPuntaje) scores[f.eneatipo_numero] = Number(f.porcentaje)
  }

  let competencias: string[] = []
  let formaciones: CandidatoContexto['formaciones'] = []
  let experiencias: CandidatoContexto['experiencias'] = []

  if (ptRaw) {
    const ptId = (ptRaw as { id: string }).id
    const [compsRes, formRes, expRes] = await Promise.all([
      admin.from('postulante_competencia').select('competencia(nombre)').eq('perfil_tecnico_id', ptId),
      admin.from('formacion_academica').select('titulo, institucion, fecha_graduacion').eq('perfil_tecnico_id', ptId),
      admin
        .from('experiencia_laboral')
        .select('puesto, empresa, fecha_inicio, fecha_fin')
        .eq('perfil_tecnico_id', ptId)
        .order('fecha_inicio', { ascending: false }),
    ])

    competencias = (compsRes.data ?? [])
      .map((c: unknown) => (c as { competencia: { nombre: string } | null }).competencia?.nombre)
      .filter((n: unknown): n is string => Boolean(n))
    formaciones = (formRes.data ?? []) as CandidatoContexto['formaciones']
    experiencias = (expRes.data ?? []) as CandidatoContexto['experiencias']
  }

  // El eneatipo del encabezado sale del mismo motor que el bloque de personalidad:
  // con un empate de dominante la base y el motor podrían nombrar eneatipos
  // distintos para un mismo candidato. Sin scores se usa el valor guardado.
  const dominanteMotor = scores ? calcularMotorV2(scores).dominante : null
  const dominanteDb = postulanteTyped.test_eneagrama?.test_eneagrama_dominante[0]?.eneatipo

  const notasPrivadas = filtrarNotasDelPuesto(
    (notasRes.data ?? []) as { contenido: string; puesto_id: string | null }[],
    puestoId
  )

  const informe = informeRaw as
    | { contenido_json: InformePersonalidadJSON | null; desactualizado: boolean }
    | null

  return {
    nombre: postulanteTyped.nombre_completo,
    eneatipoNumero: dominanteMotor?.numero ?? dominanteDb?.numero_eneatipo ?? null,
    eneatipoNombre: dominanteMotor?.nombre ?? dominanteDb?.nombre ?? null,
    competencias,
    formaciones,
    experiencias,
    informePersonalidad: construirBloquePersonalidad(
      scores,
      informe?.contenido_json ?? null,
      { desactualizado: informe?.desactualizado === true }
    ),
    notasPrivadas,
  }
}

/**
 * Notas que aplican al puesto: las escritas para ese puesto y las generales
 * (sin puesto). Las de otros puestos quedan afuera. Conserva el orden recibido.
 */
export function filtrarNotasDelPuesto(
  notas: { contenido: string; puesto_id: string | null }[],
  puestoId: string
): string[] {
  return notas
    .filter((n) => n.puesto_id === puestoId || n.puesto_id === null)
    .map((n) => n.contenido)
    .slice(0, MAX_NOTAS)
}
